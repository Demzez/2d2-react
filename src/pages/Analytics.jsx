import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { BarChart3, CalendarDays, ChevronLeft, ChevronRight, EllipsisVertical, PlusCircle, TrendingUp } from 'lucide-react';
import { endpoints } from '../lib/api';
import { currentMonth, money, monthLabel, monthsShort, phoneValid } from '../lib/format';
import { Button, Card, Confirm, Dialog, EmptyMessage, InlineError, MonthPicker, State, useToast } from '../components/UI';

const COLORS = ['#006d60', '#00b978', '#5abdb1', '#b3dfd2'];
const nameMonth = (value) => new Intl.DateTimeFormat('ru-RU', { month: 'long', timeZone: 'UTC' }).format(new Date(`${value}-01T12:00:00Z`));
function advanceMonth(value, diff) { const [year, month] = value.split('-').map(Number); const d = new Date(Date.UTC(year, month - 1 + diff, 1)); return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`; }
function Favorites() {
  const q = useQuery({ queryKey: ['favorites'], queryFn: endpoints.favorites });
  const client = useQueryClient(); const toast = useToast();
  const [editing, setEditing] = useState(null);
  const [removing, setRemoving] = useState(null);
  const [form, setForm] = useState({ name: '', phone: '+375' });
  const [error, setError] = useState(null);
  const [openMenu, setOpenMenu] = useState(null);
  const mutation = useMutation({ mutationFn: ({ id, data }) => id == null ? endpoints.addFavorite(data) : endpoints.updateFavorite(id, data), onSuccess: async () => {
    await client.invalidateQueries({ queryKey: ['favorites'] }); setEditing(null); setError(null); toast('Контакт сохранён');
  }, onError: setError });
  const deleteMutation = useMutation({ mutationFn: endpoints.deleteFavorite, onSuccess: async () => {
    await client.invalidateQueries({ queryKey: ['favorites'] }); setRemoving(null); toast('Контакт удалён');
  }, onError: (err) => toast(err.message, 'error') });
  const openEdit = (item) => { setForm(item ? { name: item.name, phone: item.phone } : { name: '', phone: '+375' }); setEditing(item || { id: null }); setOpenMenu(null); setError(null); };
  const save = (e) => { e.preventDefault(); if (!phoneValid(form.phone)) return setError(new Error('Номер должен быть в формате +375291234567')); mutation.mutate({ id: editing.id, data: { name: form.name.trim(), phone: form.phone.trim() } }); };
  return <Card className="favorites-card"><div className="section-heading"><h2>Любимые собеседники</h2><button className="circle-plus" aria-label="Добавить собеседника" title="Добавить собеседника" onClick={() => openEdit(null)}><PlusCircle size={22}/></button></div>
    <State isLoading={q.isLoading} error={q.error} onRetry={q.refetch}>
      <div className="favorite-list">{q.data?.items?.length ? q.data.items.map((c, i) => <div className="favorite-row" key={c.id}>
        <div className={`favorite-avatar avatar-${i % 4}`}>{c.name?.slice(0, 1).toUpperCase()}</div><div className="favorite-contact"><strong>{c.name}</strong><span>{c.phone}</span></div>
        <div className="favorite-actions"><button className="icon-button" aria-label={`Действия: ${c.name}`} onClick={() => setOpenMenu(openMenu === c.id ? null : c.id)}><EllipsisVertical size={21}/></button>
          {openMenu === c.id && <div className="dropdown-menu"><button onClick={() => openEdit(c)}>Изменить</button><button onClick={() => { setRemoving(c); setOpenMenu(null); }}>Удалить</button></div>}
        </div></div>) : <EmptyMessage text="Добавьте любимого собеседника с помощью кнопки +"/>}</div>
    </State>
    {editing && <Dialog title={editing.id == null ? 'Добавить собеседника' : 'Изменить собеседника'} onClose={() => setEditing(null)}><form onSubmit={save} className="modal-form"><label className="form-label">Имя<input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} maxLength={80} required autoFocus/></label><label className="form-label">Телефон<input type="tel" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} required /></label><InlineError error={error}/><div className="modal-actions"><Button variant="neutral" type="button" onClick={() => setEditing(null)}>Отмена</Button><Button type="submit" loading={mutation.isPending}>Сохранить</Button></div></form></Dialog>}
    {removing && <Confirm title="Удалить собеседника?" description={`Контакт «${removing.name}» будет удалён из избранного.`} confirmText="Удалить" danger loading={deleteMutation.isPending} onCancel={() => setRemoving(null)} onConfirm={() => deleteMutation.mutate(removing.id)}/>}
  </Card>;
}
function Calendar({ month, onChange, activeDays }) {
  const navigate = useNavigate();
  const [year, m] = month.split('-').map(Number);
  const first = new Date(Date.UTC(year, m - 1, 1)).getUTCDay();
  const offset = (first + 6) % 7;
  const days = new Date(Date.UTC(year, m, 0)).getUTCDate();
  const prevDays = new Date(Date.UTC(year, m - 1, 0)).getUTCDate();
  const total = Math.ceil((offset + days) / 7) * 7;
  const active = new Set(activeDays || []);
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Minsk', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const cells = Array.from({ length: total }, (_, i) => {
    const day = i - offset + 1;
    const iso = day >= 1 && day <= days ? `${month}-${String(day).padStart(2, '0')}` : '';
    return { label: day <= 0 ? prevDays + day : day > days ? day - days : day, iso, outside: !iso, active: active.has(iso) };
  });
  return <Card className="calendar-card"><div className="calendar-controls"><button className="icon-button" aria-label="Предыдущий месяц" onClick={() => onChange(advanceMonth(month, -1))}><ChevronLeft size={20}/></button><label><span className="visually-hidden">Месяц</span><input type="month" value={month} onChange={(e) => { if (/^\d{4}-\d{2}$/.test(e.target.value)) onChange(e.target.value); }} /></label><button className="icon-button" aria-label="Следующий месяц" onClick={() => onChange(advanceMonth(month, 1))}><ChevronRight size={20}/></button></div>
    <div className="calendar-grid"><div className="day-head">Пн</div><div className="day-head">Вт</div><div className="day-head">Ср</div><div className="day-head">Чт</div><div className="day-head">Пт</div><div className="day-head">Сб</div><div className="day-head">Вс</div>
      {cells.map((cell, i) => <button key={i} type="button" className={`calendar-day ${cell.outside ? 'outside' : ''} ${cell.active ? 'has-activity' : ''} ${cell.iso === today ? 'today' : ''}`} disabled={!cell.active} title={cell.active ? 'Просмотреть события за день' : cell.iso || ''} onClick={() => navigate(`/finance/details?from=${cell.iso}&to=${cell.iso}`)}>{cell.label}</button>)}
    </div><p className="calendar-note">Выделенные дни — есть события потребления. Нажмите для детализации.</p></Card>;
}
function MinutesChart({ data }) {
  const points = (data || []).map((p) => ({ ...p, monthLabel: monthsShort(p.month) }));
  return <Card className="minutes-card"><div className="analytics-card-header"><div><h2>Минуты</h2><small>Общая длительность</small></div><BarChart3 size={21}/></div>
    <div className="minutes-content"><div className="chart-legend"><span><i style={{ background: '#006d60' }}/> Сеть 2D2</span><span><i style={{ background: '#4abcb1' }}/> Другие сети</span></div><div className="minutes-chart"><ResponsiveContainer width="100%" height="100%"><LineChart data={points} margin={{ top: 12, right: 8, left: 0, bottom: 0 }}><XAxis dataKey="monthLabel" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#999' }}/><Tooltip formatter={(n) => [`${n} мин`, '']} /><Line dataKey="own" type="monotone" stroke="#006d60" strokeWidth={3} dot={false} name="Сеть 2D2"/><Line dataKey="other" type="monotone" stroke="#4abcb1" strokeWidth={3} dot={false} name="Другие сети"/></LineChart></ResponsiveContainer></div></div>
  </Card>;
}
function PaymentsPie({ payment }) {
  const parts = payment?.parts || [];
  const labels = { tariff: 'Тариф', service: 'Услуги', usage: 'Потребление' };
  const data = parts.map((i) => ({ name: labels[i.type] || i.type, value: Number(i.amount_byn || 0), percent: i.percent }));
  const total = Number(payment?.total_byn || 0);
  return <Card className="pie-card"><div className="analytics-card-header"><h2>Структура начислений</h2><small>За выбранный месяц</small></div>
    {total > 0 ? <div className="pie-content"><div className="pie-chart"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={data} dataKey="value" innerRadius={0} outerRadius="90%" startAngle={90} endAngle={-270} strokeWidth={0}>{data.map((p, i) => <Cell key={p.name} fill={COLORS[i % COLORS.length]}/>)}</Pie><Tooltip formatter={(v) => money(v)}/></PieChart></ResponsiveContainer></div><div className="pie-legend">{data.map((p, i) => <div key={p.name}><span><i style={{ background: COLORS[i % COLORS.length] }}/>{p.name}</span><strong>{Number(p.percent || 0).toLocaleString('ru-RU', { maximumFractionDigits: 1 })}%</strong></div>)}</div></div> : <EmptyMessage text="В выбранном месяце начислений нет."/>}
  </Card>;
}
function PopularServices({ items }) {
  return <Card className="popular-card"><h2>Популярные услуги</h2>{items?.length ? items.map((s, i) => <div className="popular-row" key={s.service_id}><div className={`popular-avatar popular-avatar-${i % 3}`}>{i + 1}</div><div className="popular-content"><strong>{s.name}</strong><div className="popular-progress"><div style={{ width: `${Math.min(100, Math.max(0, Number(s.percent_connected) || 0))}%` }}/></div></div><span>{Number(s.percent_connected).toLocaleString('ru-RU', { maximumFractionDigits: 1 })}% подключено</span></div>) : <EmptyMessage text="Нет статистики популярности услуг."/>}</Card>;
}
function InternetChart({ data }) {
  const totalMb = (data || []).reduce((a, x) => a + Number(x.used_mb || 0), 0);
  const chartData = (data || []).map((i) => ({ day: i.date.slice(8), gb: +(Number(i.used_mb || 0) / 1024).toFixed(3) }));
  return <Card className="internet-card"><small>Интернет-трафик</small><h2>{(totalMb / 1024).toLocaleString('ru-RU', { maximumFractionDigits: 2 })} <span>ГБ за месяц</span></h2>
    <div className="internet-chart">{chartData.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={chartData} margin={{ top: 5, bottom: 0, left: -35, right: 3 }}><XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#999' }} interval="preserveStartEnd"/><YAxis hide/><Tooltip formatter={(n) => [`${Number(n).toLocaleString('ru-RU', { maximumFractionDigits: 3 })} ГБ`, 'Трафик']}/><Bar dataKey="gb" fill="#007968" radius={[6, 6, 0, 0]} maxBarSize={22}/></BarChart></ResponsiveContainer> : <EmptyMessage text="Нет статистики трафика."/>}</div>
  </Card>;
}
export default function Analytics() {
  const [month, setMonth] = useState(currentMonth());
  const [monthsCount, setMonthsCount] = useState(6);
  const navigate = useNavigate();
  const q = useQuery({ queryKey: ['analytics', month, monthsCount], queryFn: () => endpoints.analytics(month, monthsCount) });
  return <div className="analytics-screen"><div className="analytics-month-bar"><MonthPicker value={month} onChange={setMonth} label="Отчётный месяц"/><label className="month-select"><span>Период графика</span><select value={monthsCount} onChange={(e) => setMonthsCount(Number(e.target.value))}><option value="3">3 месяца</option><option value="6">6 месяцев</option><option value="9">9 месяцев</option><option value="12">12 месяцев</option></select></label></div>
    <State isLoading={q.isLoading} error={q.error} onRetry={q.refetch}><div className="analytics-grid">
      <button className="analytics-banner promo-banner" onClick={() => navigate('/services?status=available')}>Оставайтесь с нами! Море предложений! <ChevronRight/></button>
      <button className="analytics-banner services-banner" onClick={() => navigate('/services')}>Услуги <ChevronRight/></button>
      <MinutesChart data={q.data?.minutes_by_month}/><PaymentsPie payment={q.data?.payment_distribution}/>
      <PopularServices items={q.data?.popular_services}/><InternetChart data={q.data?.internet_by_day}/>
      <div className="analytics-favorites"><Favorites/></div><div className="analytics-calendar"><Calendar month={month} onChange={setMonth} activeDays={q.data?.calendar_activity_days}/></div>
    </div></State>
  </div>;
}
