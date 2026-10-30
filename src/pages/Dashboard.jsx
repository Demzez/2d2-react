import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Hexagon, Infinity, ShieldCheck, Smartphone } from 'lucide-react';
import { endpoints } from '../lib/api';
import { gb, money, prettyMetric } from '../lib/format';
import { BalanceCard, Card, NavCard, State } from '../components/UI';

function TrafficRow({ name, description, unlimited, remaining, quota, metric }) {
  return <div className="traffic-row">
    <div className="traffic-symbol">{unlimited ? <Infinity size={68} strokeWidth={3}/> : <Hexagon size={59} strokeWidth={3}/>}</div>
    <div className="traffic-info"><strong>{unlimited ? name : metric === 'internet_mb' ? `${gb(remaining)} из ${gb(quota)} осталось` : `${Number(remaining || 0).toLocaleString('ru-RU')} из ${Number(quota || 0).toLocaleString('ru-RU')} мин осталось`}</strong></div>
    <div className="traffic-description">{description || (unlimited ? 'Без ограничений в рамках условий услуги' : prettyMetric(metric))}</div>
  </div>;
}
export default function Dashboard() {
  const navigate = useNavigate();
  const query = useQuery({ queryKey: ['dashboard'], queryFn: endpoints.dashboard });
  const d = query.data;
  const traffic = d?.traffic;
  return <State isLoading={query.isLoading} error={query.error} onRetry={query.refetch}>
    <div className="dashboard-grid">
      <div className="dashboard-main">
        <BalanceCard balance={d?.balance_byn} updated={d?.balance_updated_at} onTopup={() => navigate('/finance/topup')} />
        <div className="two-cards"><NavCard title="Тарифный план" text={d?.tariff?.name || 'Не указан'} to="/tariffs"/><NavCard title="Услуги" text={`Подключено ${d?.connected_services_count ?? '—'}`} to="/services"/></div>
        <Card className="traffic-card"><h2 className="card-title">Остатки трафика</h2>
          <div className="traffic-list">
            {traffic?.internet && <TrafficRow name="Интернет по тарифу" description="Основной пакет мобильного интернета" remaining={traffic.internet.remaining_mb} quota={traffic.internet.included_mb} metric="internet_mb"/>}
            {(traffic?.services || []).map((item) => <TrafficRow key={item.service_id} name={item.name} unlimited={item.is_unlimited} remaining={item.remaining_amount} quota={item.quota_amount} metric={item.metric} description={item.is_unlimited ? `Услуга «${item.name}»` : `${prettyMetric(item.metric)} · услуга «${item.name}»`}/>) }
            {!traffic?.internet && !traffic?.services?.length && <p className="muted">Сведения о пакетах пока отсутствуют.</p>}
          </div>
        </Card>
      </div>
      <aside className="dashboard-side">
        <Card className="recommendations-card"><h2 className="card-title">2D2 Рекомендует <ChevronRight size={21}/></h2>
          {d?.recommendations?.length ? d.recommendations.map((r) => <button key={`${r.type}-${r.id}`} className="recommendation" onClick={() => navigate(r.type === 'tariff' ? '/tariffs' : '/services?status=available')}>{r.title}<ChevronRight size={17}/></button>) : <p className="muted">Новых предложений пока нет</p>}
          <button className="recommendation" onClick={() => navigate('/services?status=available')}>Лучшие предложения <ChevronRight size={17}/></button>
        </Card>
        <NavCard title="Управление номером" to="/number" className="side-nav-card"/>
        <NavCard title="Безопасный интернет" to="/services?category=security" className="side-nav-card"/>
        <NavCard title="Роуминг" to="/services?category=roaming" className="side-nav-card"/>
        <Card className="side-helper"><ShieldCheck size={24}/><div><strong>Контроль услуг</strong><p>Посмотрите статистику использования и предупреждения о расходе пакетов.</p></div><button className="text-link" onClick={() => navigate('/analytics')}>Аналитика <ChevronRight size={17}/></button></Card>
      </aside>
    </div>
  </State>;
}
