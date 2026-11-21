import { useQuery } from '@tanstack/react-query';
import { endpoints } from '../lib/api.js';
import { Card, MetricTiles, NavCard, PageHeading, State } from '../components/UI';

export default function AdminOverview() {
  const query = useQuery({
    queryKey: ['admin', 'overview'],
    queryFn: endpoints.admin.overview,
  });
  const d = query.data || {};

  return (
    <>
      <PageHeading
        category="Панель администратора"
        title="Сводка по оператору"
        subtitle="Ключевые показатели абонентской базы и каталога услуг 2D2"
      />
      <State isLoading={query.isLoading} error={query.error} onRetry={query.refetch}>
        <Card>
          <h2 className="card-title">Показатели сети и биллинга</h2>
          <MetricTiles
            items={[
              { label: 'Всего абонентов', value: d.total_subscribers ?? 0 },
              { label: 'Заблокированные номера', value: d.blocked_numbers ?? 0 },
              { label: 'Отрицательный баланс', value: d.negative_balance_numbers ?? 0 },
              { label: 'Активные подключения услуг', value: d.active_service_connections ?? 0 },
              { label: 'Активных услуг в каталоге', value: d.active_catalog_services ?? 0 },
            ]}
          />
        </Card>

        <div className="finance-menu" style={{ marginTop: 28 }}>
          <NavCard
            title="Абоненты"
            text="Поиск, просмотр карточек и административная блокировка номеров"
            to="/admin/subscribers"
          />
          <NavCard
            title="Каталог тарифов"
            text="Создание, редактирование и архивация тарифных планов"
            to="/admin/tariffs"
          />
          <NavCard
            title="Каталог услуг"
            text="Управление пакетами интернета, минут, роуминга и безопасности"
            to="/admin/services"
          />
        </div>
      </State>
    </>
  );
}
