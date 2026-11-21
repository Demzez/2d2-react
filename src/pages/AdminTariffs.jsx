import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Search, SlidersHorizontal, Trash2 } from 'lucide-react';
import { endpoints } from '../lib/api.js';
import { gb, money } from '../lib/format';
import { Button, Card, Confirm, Dialog, EmptyMessage, InlineError, PageHeading, State, useToast } from '../components/UI';

const statuses = [
  ['all', 'Все тарифы'],
  ['active', 'Активные'],
  ['inactive', 'Архивные'],
];

const emptyForm = {
  code: '',
  name: '',
  description: '',
  monthly_fee_byn: '0.00',
  included_internet_mb: 10240,
  is_featured: false,
  is_active: true,
};

function formatMoneyInput(val) {
  const num = Number(String(val).replace(',', '.'));
  if (!Number.isFinite(num) || num < 0) return null;
  return num.toFixed(2);
}

export default function AdminTariffs() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
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
    queryKey: ['admin', 'tariffs', debouncedSearch, status],
    queryFn: () => endpoints.admin.tariffs({ search: debouncedSearch, status }),
  });

  const saveMutation = useMutation({
    mutationFn: (payload) =>
      editing
        ? endpoints.admin.updateTariff(editing.id, payload)
        : endpoints.admin.createTariff(payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin', 'tariffs'] }),
        queryClient.invalidateQueries({ queryKey: ['tariffs'] }),
      ]);
      toast(editing ? 'Тариф обновлён' : 'Тариф создан');
      setModalOpen(false);
      setEditing(null);
    },
    onError: (err) => setFormError(err),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => endpoints.admin.deleteTariff(id),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin', 'tariffs'] }),
        queryClient.invalidateQueries({ queryKey: ['tariffs'] }),
      ]);
      toast('Тариф удалён');
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

  const openEdit = (tariff) => {
    setEditing(tariff);
    setForm({
      code: tariff.code,
      name: tariff.name,
      description: tariff.description || '',
      monthly_fee_byn: tariff.monthly_fee_byn,
      included_internet_mb: tariff.included_internet_mb,
      is_featured: Boolean(tariff.is_featured),
      is_active: Boolean(tariff.is_active),
    });
    setFormError(null);
    setModalOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormError(null);
    const fee = formatMoneyInput(form.monthly_fee_byn);
    if (!fee) return setFormError(new Error('Укажите корректную абонентскую плату (например, 15.90)'));
    const mb = Number(form.included_internet_mb);
    if (!Number.isInteger(mb) || mb < 0) {
      return setFormError(new Error('Пакет интернета в МБ должен быть целым неотрицательным числом'));
    }
    saveMutation.mutate({
      code: form.code.trim(),
      name: form.name.trim(),
      description: form.description.trim(),
      monthly_fee_byn: fee,
      included_internet_mb: mb,
      is_featured: Boolean(form.is_featured),
      is_active: Boolean(form.is_active),
    });
  };

  const items = query.data?.items || [];

  return (
    <>
      <PageHeading
        category="Панель администратора"
        title="Каталог тарифов"
        subtitle="Управление тарифными планами оператора"
        right={
          <Button icon={Plus} onClick={openCreate}>
            Создать тариф
          </Button>
        }
      />

      <div className="services-toolbar">
        <label className="search-box">
          <Search size={23} />
          <input
            aria-label="Поиск тарифов"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по коду или названию тарифа"
          />
        </label>
        <label className="category-select">
          <SlidersHorizontal size={19} />
          <select aria-label="Статус тарифов" value={status} onChange={(e) => setStatus(e.target.value)}>
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
                    <th>Абон. плата</th>
                    <th>Интернет</th>
                    <th>Статус</th>
                    <th>Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((t) => (
                    <tr key={t.id}>
                      <td><code>{t.code}</code></td>
                      <td>
                        <strong>{t.name}</strong> {t.is_featured && <span className="small-tag" style={{ display: 'inline-flex', marginLeft: 6 }}>Рекомендуемый</span>}
                        {t.description && <div className="muted" style={{ fontSize: 13 }}>{t.description}</div>}
                      </td>
                      <td><strong>{money(t.monthly_fee_byn)}</strong>/мес</td>
                      <td>{gb(t.included_internet_mb)} ({t.included_internet_mb} МБ)</td>
                      <td>
                        <span className={`status-pill ${t.is_active ? 'status-paid' : 'status-failed'}`}>
                          {t.is_active ? 'Активен' : 'Отключён'}
                        </span>
                      </td>
                      <td>
                        <div className="admin-actions-cell">
                          <Button variant="neutral" icon={Pencil} onClick={() => openEdit(t)}>
                            Изменить
                          </Button>
                          <Button variant="outline" icon={Trash2} onClick={() => setDeleteTarget(t)}>
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
            <EmptyMessage text="Тарифы не найдены." />
          )}
        </Card>
      </State>

      {modalOpen && (
        <Dialog
          title={editing ? `Редактирование тарифа «${editing.name}»` : 'Новый тарифный план'}
          onClose={() => setModalOpen(false)}
        >
          <form className="modal-form" onSubmit={handleSubmit}>
            <label className="form-label">
              Код тарифа (латиница, цифры, _ или -) <b>*</b>
              <input
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                placeholder="comfort-m"
                pattern="[A-Za-z0-9_-]{2,50}"
                required
              />
            </label>
            <label className="form-label">
              Название тарифа <b>*</b>
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Комфорт M"
                maxLength={120}
                required
              />
            </label>
            <label className="form-label">
              Описание
              <textarea
                rows={3}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Краткое описание условий тарифа"
              />
            </label>
            <div className="form-two">
              <label className="form-label">
                Абон. плата (BYN) <b>*</b>
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
                Интернет (МБ) <b>*</b>
                <input
                  type="number"
                  step="1"
                  min="0"
                  value={form.included_internet_mb}
                  onChange={(e) => setForm((f) => ({ ...f, included_internet_mb: e.target.value }))}
                  required
                />
              </label>
            </div>
            <label className="checkbox-line">
              <input
                type="checkbox"
                checked={form.is_featured}
                onChange={(e) => setForm((f) => ({ ...f, is_featured: e.target.checked }))}
              />
              Выделенный / рекомендуемый тариф
            </label>
            <label className="checkbox-line">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
              />
              Доступен для подключения абонентам
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
          title="Удалить тариф?"
          description={`Тариф «${deleteTarget.name}» (${deleteTarget.code}) будет удалён из каталога. Если тариф назначен хотя бы одному абоненту, удаление будет отклонено.`}
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
