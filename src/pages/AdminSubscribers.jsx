import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye, LockKeyhole, Search, SlidersHorizontal, Unlock } from 'lucide-react';
import { endpoints } from '../lib/api.js';
import { money, shortDate } from '../lib/format';
import { Button, Card, Confirm, Dialog, EmptyMessage, PageHeading, State, useToast } from '../components/UI';

const statuses = [
  ['all', 'Все абоненты'],
  ['active', 'Активные'],
  ['blocked', 'Заблокированные'],
];

export default function AdminSubscribers() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const limit = 20;

  const [detailId, setDetailId] = useState(null);
  const [blockTarget, setBlockTarget] = useState(null);

  const queryClient = useQueryClient();
  const toast = useToast();

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const listQuery = useQuery({
    queryKey: ['admin', 'subscribers', debouncedSearch, status, page, limit],
    queryFn: () => endpoints.admin.subscribers({ search: debouncedSearch, status, page, limit }),
  });

  const detailQuery = useQuery({
    queryKey: ['admin', 'subscriber', detailId],
    queryFn: () => endpoints.admin.subscriber(detailId),
    enabled: Boolean(detailId),
  });

  const blockMutation = useMutation({
    mutationFn: ({ id, admin_blocked }) => endpoints.admin.blockSubscriber(id, admin_blocked),
    onSuccess: async (_, vars) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin', 'subscribers'] }),
        queryClient.invalidateQueries({ queryKey: ['admin', 'subscriber', vars.id] }),
        queryClient.invalidateQueries({ queryKey: ['admin', 'overview'] }),
      ]);
      toast(vars.admin_blocked ? 'Номер заблокирован администратором' : 'Административная блокировка снята');
      setBlockTarget(null);
    },
    onError: (err) => toast(err.message, 'error'),
  });

  const items = listQuery.data?.items || [];
  const total = listQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <>
      <PageHeading
        category="Панель администратора"
        title="Управление абонентами"
        subtitle={`Всего найдено: ${total}`}
      />

      <div className="services-toolbar">
        <label className="search-box">
          <Search size={23} />
          <input
            aria-label="Поиск абонентов"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по ФИО, логину, номеру или счёту"
          />
        </label>
        <label className="category-select">
          <SlidersHorizontal size={19} />
          <select
            aria-label="Статус номера"
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          >
            {statuses.map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
        </label>
      </div>

      <State isLoading={listQuery.isLoading} error={listQuery.error} onRetry={listQuery.refetch}>
        <Card className="list-card">
          {items.length ? (
            <div className="data-table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Абонент</th>
                    <th>Номер / Счёт</th>
                    <th>Тариф</th>
                    <th>Баланс</th>
                    <th>Статус</th>
                    <th>Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((sub) => {
                    const adminBlocked = Boolean(sub.number?.admin_blocked);
                    const userBlocked = Boolean(sub.number?.is_blocked);
                    return (
                      <tr key={sub.id}>
                        <td>#{sub.id}</td>
                        <td>
                          <strong>{sub.user?.full_name}</strong>
                          <div className="muted" style={{ fontSize: 13 }}>@{sub.user?.login}</div>
                        </td>
                        <td>
                          <strong>{sub.number?.msisdn}</strong>
                          <div className="muted" style={{ fontSize: 13 }}>{sub.number?.account_number}</div>
                        </td>
                        <td>{sub.tariff?.name}</td>
                        <td style={{ color: Number(sub.balance_byn) < 0 ? '#bb4e48' : 'inherit', fontWeight: 600 }}>
                          {money(sub.balance_byn)}
                        </td>
                        <td>
                          {adminBlocked ? (
                            <span className="status-pill status-failed">Блок админом</span>
                          ) : userBlocked ? (
                            <span className="status-pill">Блок абонентом</span>
                          ) : (
                            <span className="status-pill status-paid">Активен</span>
                          )}
                        </td>
                        <td>
                          <div className="admin-actions-cell">
                            <Button variant="neutral" icon={Eye} onClick={() => setDetailId(sub.id)}>
                              Карточка
                            </Button>
                            <Button
                              variant={adminBlocked ? 'primary' : 'outline'}
                              icon={adminBlocked ? Unlock : LockKeyhole}
                              onClick={() => setBlockTarget(sub)}
                            >
                              {adminBlocked ? 'Разблокировать' : 'Заблокировать'}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyMessage text="Абоненты по заданным условиям не найдены." />
          )}

          {totalPages > 1 && (
            <div className="admin-pagination">
              <Button variant="neutral" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Назад
              </Button>
              <span>Страница {page} из {totalPages}</span>
              <Button variant="neutral" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                Вперёд
              </Button>
            </div>
          )}
        </Card>
      </State>

      {detailId && (
        <Dialog title={`Карточка абонента #${detailId}`} wide onClose={() => setDetailId(null)}>
          <State isLoading={detailQuery.isLoading} error={detailQuery.error} onRetry={detailQuery.refetch}>
            {detailQuery.data && (
              <div className="admin-detail-grid">
                <div>
                  <h3>Пользователь</h3>
                  <p><strong>ФИО:</strong> {detailQuery.data.user?.full_name}</p>
                  <p><strong>Логин:</strong> {detailQuery.data.user?.login}</p>
                  <p><strong>Email:</strong> {detailQuery.data.user?.email || 'не указан'}</p>
                </div>
                <div>
                  <h3>Номер и тариф</h3>
                  <p><strong>MSISDN:</strong> {detailQuery.data.number?.msisdn}</p>
                  <p><strong>Лицевой счёт:</strong> {detailQuery.data.number?.account_number}</p>
                  <p><strong>Баланс:</strong> {money(detailQuery.data.balance_byn)}</p>
                  <p><strong>Тариф:</strong> {detailQuery.data.tariff?.name} ({money(detailQuery.data.tariff?.monthly_fee_byn)}/мес)</p>
                  <p>
                    <strong>Блокировка:</strong>{' '}
                    {detailQuery.data.number?.admin_blocked
                      ? 'заблокирован администратором'
                      : detailQuery.data.number?.is_blocked
                        ? 'заблокирован абонентом'
                        : 'нет'}
                  </p>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <h3>Подключённые услуги ({detailQuery.data.connected_services?.length || 0})</h3>
                  {detailQuery.data.connected_services?.length ? (
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Услуга</th>
                          <th>Дата подключения</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detailQuery.data.connected_services.map((srv) => (
                          <tr key={srv.id}>
                            <td>#{srv.id}</td>
                            <td>{srv.name}</td>
                            <td>{shortDate(srv.connected_at)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p className="muted">Активных услуг нет.</p>
                  )}
                </div>
              </div>
            )}
          </State>
        </Dialog>
      )}

      {blockTarget && (
        <Confirm
          title={blockTarget.number?.admin_blocked ? 'Снять блокировку администратора?' : 'Заблокировать номер администратором?'}
          description={`Абонент: ${blockTarget.user?.full_name} (${blockTarget.number?.msisdn}).`}
          confirmText={blockTarget.number?.admin_blocked ? 'Разблокировать' : 'Заблокировать'}
          danger={!blockTarget.number?.admin_blocked}
          loading={blockMutation.isPending}
          onCancel={() => setBlockTarget(null)}
          onConfirm={() =>
            blockMutation.mutate({
              id: blockTarget.id,
              admin_blocked: !blockTarget.number?.admin_blocked,
            })
          }
        />
      )}
    </>
  );
}
