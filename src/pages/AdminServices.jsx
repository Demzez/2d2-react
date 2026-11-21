import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Search, SlidersHorizontal, Trash2 } from 'lucide-react';
import { endpoints } from '../lib/api.js';
import { money, prettyMetric } from '../lib/format';
import { Button, Card, Confirm, Dialog, EmptyMessage, InlineError, PageHeading, State, useToast } from '../components/UI';

const categories = [
  ['all', 'Все категории'],
  ['internet', 'Интернет'],
  ['messengers', 'Мессенджеры'],
  ['calls', 'Звонки'],
  ['security', 'Безопасность'],
  ['roaming', 'Роуминг'],
  ['other', 'Другие'],
];

const metrics = [
  ['', 'Без квоты / опция'],
  ['internet_mb', 'Интернет (МБ)'],
  ['messenger_mb', 'Мессенджеры (МБ)'],
  ['minutes_own', 'Минуты внутри сети'],
  ['minutes_other', 'Минуты в другие сети'],
  ['minutes_roaming', 'Минуты в роуминге'],
];

const statuses = [
  ['all', 'Все статусы'],
  ['active', 'Активные'],
  ['inactive', 'Отключённые'],
];

const emptyForm = {
  code: '',
  name: '',
  description: '',
  category: 'internet',
  monthly_fee_byn: '0.00',
  quota_metric: '',
  quota_amount: '',
  is_unlimited: false,
  is_featured: false,
  is_active: true,
};

function formatMoneyInput(val) {
  const num = Number(String(val).replace(',', '.'));
  if (!Number.isFinite(num) || num < 0) return null;
  return num.toFixed(2);
}

export default function AdminServices() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [status, setStatus] = useState('all');

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const queryClient = useQueryClient();
  const toast = useToast();

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const query = useQuery({
    queryKey: ['admin', 'services', debouncedSearch, category, status],
    queryFn: () =>
      endpoints.admin.services({
        search: debouncedSearch,
        category: category === 'all' ? undefined : category,
        status,
      }),
  });

  const saveMutation = useMutation({
    mutationFn: (payload) =>
      editing
        ? endpoints.admin.updateService(editing.id, payload)
        : endpoints.admin.createService(payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin', 'services'] }),
        queryClient.invalidateQueries({ queryKey: ['admin', 'overview'] }),
        queryClient.invalidateQueries({ queryKey: ['services'] }),
      ]);
      toast(editing ? 'Услуга обновлена' : 'Услуга создана');
      setModalOpen(false);
      setEditing(null);
    },
    onError: (err) => setFormError(err),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, is_active }) => endpoints.admin.updateService(id, { is_active }),
    onSuccess: async (_, vars) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin', 'services'] }),
        queryClient.invalidateQueries({ queryKey: ['admin', 'overview'] }),
        queryClient.invalidateQueries({ queryKey: ['services'] }),
      ]);
      toast(vars.is_active ? 'Услуга включена в каталоге' : 'Услуга скрыта из каталога');
    },
    onError: (err) => toast(err.message, 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => endpoints.admin.deleteService(id),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin', 'services'] }),
        queryClient.invalidateQueries({ queryKey: ['admin', 'overview'] }),
        queryClient.invalidateQueries({ queryKey: ['services'] }),
      ]);
      toast('Услуга удалена');
      setDeleteTarget(null);
    },
    onError: (err) => {
      toast(err.message, 'error');
      setDeleteTarget(null);
    },
  });

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (srv) => {
    setEditing(srv);
    setForm({
      code: srv.code,
      name: srv.name,
      description: srv.description || '',
      category: srv.category,
      monthly_fee_byn: srv.monthly_fee_byn,
      quota_metric: srv.quota_metric || '',
      quota_amount: srv.quota_amount != null ? String(srv.quota_amount) : '',
      is_unlimited: Boolean(srv.is_unlimited),
      is_featured: Boolean(srv.is_featured),
      is_active: Boolean(srv.is_active),
    });
    setFormError(null);
    setModalOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormError(null);
    const fee = formatMoneyInput(form.monthly_fee_byn);
    if (!fee) return setFormError(new Error('Укажите корректную стоимость (например, 4.90)'));

    const metric = form.quota_metric || null;
    const isUnlimited = Boolean(form.is_unlimited);
    let amount = null;

    if (isUnlimited) {
      if (!metric) {
        return setFormError(new Error('Для безлимитной услуги необходимо выбрать метрику квоты'));
      }
      amount = null;
    } else if (form.quota_amount !== '' && form.quota_amount != null) {
      const parsed = Number(form.quota_amount);
      if (!Number.isInteger(parsed) || parsed <= 0) {
        return setFormError(new Error('Объём пакета должен быть положительным целым числом'));
      }
      if (!metric) {
        return setFormError(new Error('Укажите метрику квоты для заданного объёма пакета'));
      }
      amount = parsed;
    }

    saveMutation.mutate({
      code: form.code.trim(),
      name: form.name.trim(),
      description: form.description.trim(),
      category: form.category,
      monthly_fee_byn: fee,
      quota_metric: metric,
      quota_amount: amount,
      is_unlimited: isUnlimited,
      is_featured: Boolean(form.is_featured),
      is_active: Boolean(form.is_active),
    });
  };

  const items = query.data?.items || [];

  return (
    <>
      <PageHeading
        category="Панель администратора"
        title="Каталог услуг"
        subtitle="Создание, настройка лимитов и управление доступностью услуг"
        right={
          <Button icon={Plus} onClick={openCreate}>
            Создать услугу
          </Button>
        }
      />

      <div className="services-toolbar">
        <label className="search-box">
          <Search size={23} />
          <input
            aria-label="Поиск услуг"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по коду или названию услуги"
          />
        </label>
        <label className="category-select">
          <SlidersHorizontal size={19} />
          <select aria-label="Категория" value={category} onChange={(e) => setCategory(e.target.value)}>
            {categories.map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
        </label>
        <label className="category-select">
          <select aria-label="Статус" value={status} onChange={(e) => setStatus(e.target.value)}>
            {statuses.map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
        </label>
      </div>

      <State isLoading={query.isLoading} error={query.error} onRetry={query.refetch}>
        <Card className="list-card">
          {items.length ? (
            <div className="data-table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Код</th>
                    <th>Название</th>
                    <th>Категория</th>
                    <th>Стоимость</th>
                    <th>Пакет / Квота</th>
                    <th>Статус</th>
                    <th>Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((s) => (
                    <tr key={s.id}>
                      <td><code>{s.code}</code></td>
                      <td>
                        <strong>{s.name}</strong>
                        {s.description && <div className="muted" style={{ fontSize: 13 }}>{s.description}</div>}
                      </td>
                      <td>{categories.find(([c]) => c === s.category)?.[1] || s.category}</td>
                      <td><strong>{money(s.monthly_fee_byn)}</strong>/мес</td>
                      <td>
                        {s.is_unlimited
                          ? `Безлимит (${prettyMetric(s.quota_metric)})`
                          : s.quota_amount
                            ? `${s.quota_amount} (${prettyMetric(s.quota_metric)})`
                            : 'Опция без квоты'}
                      </td>
                      <td>
                        <button
                          type="button"
                          className={`status-pill ${s.is_active ? 'status-paid' : 'status-failed'}`}
                          style={{ border: 0 }}
                          title="Нажмите, чтобы переключить доступность"
                          onClick={() => toggleActiveMutation.mutate({ id: s.id, is_active: !s.is_active })}
                        >
                          {s.is_active ? 'Активна' : 'Отключена'}
                        </button>
                      </td>
                      <td>
                        <div className="admin-actions-cell">
                          <Button variant="neutral" icon={Pencil} onClick={() => openEdit(s)}>
                            Изменить
                          </Button>
                          <Button variant="outline" icon={Trash2} onClick={() => setDeleteTarget(s)}>
                            Удалить
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyMessage text="Услуги не найдены." />
          )}
        </Card>
      </State>

      {modalOpen && (
        <Dialog
          title={editing ? `Редактирование услуги «${editing.name}»` : 'Новая услуга'}
          wide
          onClose={() => setModalOpen(false)}
        >
          <form className="modal-form" onSubmit={handleSubmit}>
            <div className="form-two">
              <label className="form-label">
                Код услуги <b>*</b>
                <input
                  value={form.code}
                  onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                  placeholder="extra-internet-2gb"
                  pattern="[A-Za-z0-9_-]{2,60}"
                  required
                />
              </label>
              <label className="form-label">
                Категория <b>*</b>
                <select
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                >
                  {categories.filter(([c]) => c !== 'all').map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
              </label>
            </div>
            <label className="form-label">
              Название услуги <b>*</b>
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Дополнительные 2 ГБ"
                maxLength={150}
                required
              />
            </label>
            <label className="form-label">
              Описание
              <textarea
                rows={2}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </label>
            <div className="form-two">
              <label className="form-label">
                Стоимость в месяц (BYN) <b>*</b>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.monthly_fee_byn}
                  onChange={(e) => setForm((f) => ({ ...f, monthly_fee_byn: e.target.value }))}
                  required
                />
              </label>
              <label className="form-label">
                Метрика квоты
                <select
                  value={form.quota_metric}
                  onChange={(e) => setForm((f) => ({ ...f, quota_metric: e.target.value }))}
                >
                  {metrics.map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
              </label>
            </div>
            <label className="checkbox-line">
              <input
                type="checkbox"
                checked={form.is_unlimited}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    is_unlimited: e.target.checked,
                    quota_amount: e.target.checked ? '' : f.quota_amount,
                  }))
                }
              />
              Безлимитное потребление по выбранной метрике
            </label>
            {!form.is_unlimited && (
              <label className="form-label">
                Объём пакета (МБ или минуты)
                <input
                  type="number"
                  step="1"
                  min="1"
                  value={form.quota_amount}
                  onChange={(e) => setForm((f) => ({ ...f, quota_amount: e.target.value }))}
                  placeholder="Оставьте пустым для услуги без квоты"
                />
              </label>
            )}
            <label className="checkbox-line">
              <input
                type="checkbox"
                checked={form.is_featured}
                onChange={(e) => setForm((f) => ({ ...f, is_featured: e.target.checked }))}
              />
              Показывать в рекомендациях (если не подключена)
            </label>
            <label className="checkbox-line">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
              />
              Активна в каталоге (доступна для новых подключений)
            </label>
            <InlineError error={formError} />
            <div className="modal-actions">
              <Button type="button" variant="neutral" onClick={() => setModalOpen(false)}>
                Отмена
              </Button>
              <Button type="submit" loading={saveMutation.isPending}>
                {editing ? 'Сохранить' : 'Создать'}
              </Button>
            </div>
          </form>
        </Dialog>
      )}

      {deleteTarget && (
        <Confirm
          title="Удалить услугу?"
          description={`Услуга «${deleteTarget.name}» (${deleteTarget.code}) будет удалена. Если услуга уже использовалась абонентами, удаление будет отклонено — вместо этого можно её отключить.`}
          confirmText="Удалить"
          danger
          loading={deleteMutation.isPending}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => deleteMutation.mutate(deleteTarget.id)}
        />
      )}
    </>
  );
}
