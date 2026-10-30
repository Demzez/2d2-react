import { useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ChevronRight, CreditCard, ReceiptText, Wallet, CalendarDays } from 'lucide-react';
import { endpoints } from '../lib/api';
import { bynAmount, currentMonth, dateTime, money, monthLabel, prettyMetric, shortMoney } from '../lib/format';
import { BalanceCard, Button, Card, EmptyMessage, InlineError, MonthPicker, NavCard, PageHeading, State, StatusPill, useToast } from '../components/UI';

export function FinanceHome() {
  const nav = useNavigate();
  const q = useQuery({ queryKey: ['finance-summary'], queryFn: endpoints.financeSummary });
  return <State isLoading={q.isLoading} error={q.error} onRetry={q.refetch}><div className="finance-home">
    <BalanceCard balance={q.data?.balance_byn} onTopup={() => nav('/finance/topup')}/>
    <div className="finance-menu"><NavCard title="Начисления" text="За текущий месяц" to="/finance/charges"/><NavCard title="Счёт" text={q.data?.latest_invoice ? `За ${monthLabel(q.data.latest_invoice.period)}` : 'За последние 12 месяцев'} to="/finance/invoices"/><NavCard title="Детализация" text="За 3 года и текущий период" to="/finance/details"/><NavCard title="Платежи" text="За последние 8 месяцев" to="/finance/payments"/></div>
    </div></State>;
}
export function Charges() {
  const [month, setMonth] = useState(currentMonth());
  const q = useQuery({ queryKey: ['charges', month], queryFn: () => endpoints.charges(month) });
  return <><PageHeading title="Начисления" category="Финансы" subtitle="Стоимость тарифа, дополнительных услуг и потребления с учётом НДС" right={<MonthPicker value={month} onChange={setMonth} />}/>
    <State isLoading={q.isLoading} error={q.error} onRetry={q.refetch}>
      <Card className="summary-banner"><span>Начислено за {monthLabel(q.data?.month || month)}</span><strong>{money(q.data?.total_byn)}</strong></Card>
      <Card className="list-card"><h2>Операции</h2>{q.data?.items?.length ? <div className="data-table-scroll"><table className="data-table"><thead><tr><th>Дата</th><th>Описание</th><th>Тип</th><th>Без НДС</th><th>НДС</th><th>Всего</th></tr></thead><tbody>{q.data.items.map((item) => <tr key={item.id}><td>{dateTime(item.charged_at)}</td><td><strong>{item.description}</strong></td><td>{({ tariff: 'Тариф', service: 'Услуга', usage: 'Потребление' })[item.type] || item.type}</td><td>{money(item.amount_byn)}</td><td>{money(item.vat_byn)}</td><td><strong>{money(item.total_byn)}</strong></td></tr>)}</tbody></table></div> : <EmptyMessage/>}</Card>
    </State></>;
}
export function Invoices() {
  const [months, setMonths] = useState(12);
  const q = useQuery({ queryKey: ['invoices', months], queryFn: () => endpoints.invoices(months) });
  const grouped = useMemo(() => (q.data?.items || []).reduce((all, invoice) => { const year = invoice.period?.slice(0, 4) || 'Без даты'; (all[year] ||= []).push(invoice); return all; }, {}), [q.data]);
  const outstanding = (q.data?.items || []).reduce((sum, inv) => sum + Number(inv.due_byn || 0), 0);
  return <><PageHeading category="Финансы" title="Счета за 12 месяцев (с учетом НДС)" subtitle="Информация о начислениях за предыдущий период доступна после 2-го числа текущего месяца" right={<label className="month-select"><span>Период</span><select value={months} onChange={(e) => setMonths(Number(e.target.value))}><option value={12}>12 месяцев</option><option value={8}>8 месяцев</option><option value={6}>6 месяцев</option><option value={3}>3 месяца</option></select></label>}/>
    <State isLoading={q.isLoading} error={q.error} onRetry={q.refetch}>
      <Card className="invoice-total"><strong>{money(outstanding)}</strong><span>Итого к оплате</span></Card>
      <Card className="invoice-list">{Object.keys(grouped).length ? Object.entries(grouped).map(([year, invoices]) => <section key={year}><h2>{year}</h2><div className="year-rule"/>{invoices.map((inv) => <Link className="invoice-row" to={`/finance/invoices/${inv.id}`} key={inv.id}>
        <strong className="invoice-month">{monthLabel(inv.period)}</strong><div className="invoice-money"><strong>{money(inv.total_byn)}</strong><span>{money(inv.due_byn)}</span></div><div className="invoice-status"><strong>Начислено</strong><span>{inv.status === 'paid' ? 'Оплачено' : 'К оплате'}</span></div><ChevronRight size={24}/>
      </Link>)}</section>) : <EmptyMessage text="Счета пока не выставлены."/>}</Card>
    </State></>;
}
export function InvoiceDetail() {
  const { id } = useParams();
  const q = useQuery({ queryKey: ['invoice', id], queryFn: () => endpoints.invoice(id), enabled: /^\d+$/.test(id || '') });
  if (!/^\d+$/.test(id || '')) return <div className="state">Неверный номер счёта.</div>;
  return <><PageHeading category="Финансы / Счета" title={`Счёт № ${id}`}/><State isLoading={q.isLoading} error={q.error} onRetry={q.refetch}>
    <Card className="invoice-detail-summary"><h2>{monthLabel(q.data?.period)}</h2><StatusPill value={q.data?.status}/><div className="metric-tiles"><div className="metric-tile"><small>Начислено</small><strong>{money(q.data?.total_byn)}</strong></div><div className="metric-tile"><small>Оплачено</small><strong>{money(q.data?.paid_byn)}</strong></div><div className="metric-tile"><small>К оплате</small><strong>{money(q.data?.due_byn)}</strong></div></div></Card>
    <Card className="list-card"><h2>Состав счёта</h2>{q.data?.items?.length ? <div className="data-table-scroll"><table className="data-table"><thead><tr><th>Описание</th><th>Тип</th><th>Без НДС</th><th>НДС</th><th>Итого</th></tr></thead><tbody>{q.data.items.map((item, i) => <tr key={i}><td>{item.description}</td><td>{({ tariff: 'Тариф', service: 'Услуга', usage: 'Потребление' })[item.type] || item.type}</td><td>{money(item.amount_byn)}</td><td>{money(item.vat_byn)}</td><td><strong>{money(item.total_byn)}</strong></td></tr>)}</tbody></table></div> : <EmptyMessage/>}</Card>
    {Number(q.data?.due_byn) > 0 && <Link className="btn btn-primary bottom-action" to="/finance/topup">Пополнить баланс</Link>}
  </State></>;
}
export function Payments() {
  const [months, setMonths] = useState(8);
  const q = useQuery({ queryKey: ['payments', months], queryFn: () => endpoints.payments(months) });
  return <><PageHeading category="Финансы" title="История платежей" subtitle="Пополнения отображаются после подтверждения платёжного провайдера" right={<label className="month-select"><span>Период</span><select value={months} onChange={(e) => setMonths(Number(e.target.value))}><option value={8}>8 месяцев</option><option value={12}>12 месяцев</option><option value={6}>6 месяцев</option><option value={3}>3 месяца</option><option value={1}>1 месяц</option></select></label>}/>
    <State isLoading={q.isLoading} error={q.error} onRetry={q.refetch}><Card className="list-card"><div className="section-heading"><h2>Платежи</h2><Link className="btn btn-primary" to="/finance/topup">Пополнить баланс</Link></div>{q.data?.items?.length ? <div className="data-table-scroll"><table className="data-table"><thead><tr><th>ID</th><th>Создан</th><th>Подтверждён</th><th>Сумма</th><th>Статус</th></tr></thead><tbody>{q.data.items.map((item) => <tr key={item.id}><td>#{item.id}</td><td>{dateTime(item.created_at)}</td><td>{dateTime(item.confirmed_at)}</td><td><strong>{money(item.amount_byn)}</strong></td><td><StatusPill value={item.status}/></td></tr>)}</tbody></table></div> : <EmptyMessage text="Платежей за выбранный период нет."/>}</Card></State>
  </>;
}
function todayMinsk() {
  const fields = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Minsk', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const part = (type) => fields.find((x) => x.type === type)?.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}
export function UsageDetails() {
  const [params, setParams] = useSearchParams();
  const today = todayMinsk();
  const [from, setFrom] = useState(params.get('from') || `${today.slice(0, 7)}-01`);
  const [to, setTo] = useState(params.get('to') || today);
  const page = Math.max(1, Number(params.get('page')) || 1);
  const limit = 20;
  const maxEnd = from ? (() => { const d = new Date(`${from}T00:00:00Z`); d.setUTCFullYear(d.getUTCFullYear() + 3); return d.toISOString().slice(0, 10); })() : '';
  const validRange = from <= to && Boolean(from && to) && to <= maxEnd;
  const actualFrom = params.get('from') || `${today.slice(0, 7)}-01`;
  const actualTo = params.get('to') || today;
  const q = useQuery({ queryKey: ['usage', actualFrom, actualTo, page], queryFn: () => endpoints.usageDetails({ from: actualFrom, to: actualTo, page, limit }), enabled: actualFrom <= actualTo });
  const changePeriod = (e) => { e.preventDefault(); if (validRange) setParams({ from, to, page: '1' }); };
  return <><PageHeading category="Финансы" title="Детализация потребления" subtitle="Сведения об использовании мобильного интернета и звонках"/>
    <Card className="filters-card"><form className="filters-row" onSubmit={changePeriod}><label className="form-label">С<input type="date" value={from} onChange={(e) => setFrom(e.target.value)} required/></label><label className="form-label">По<input type="date" value={to} onChange={(e) => setTo(e.target.value)} required/></label><Button type="submit" disabled={!validRange}>Показать</Button></form>{!validRange && <p className="field-error">Проверьте диапазон: начало не позже конца, максимум 3 года.</p>}</Card>
    <State isLoading={q.isLoading} error={q.error} onRetry={q.refetch}><Card className="list-card"><div className="section-heading"><h2>События потребления</h2><span className="muted">Всего: {q.data?.total ?? 0}</span></div>{q.data?.items?.length ? <div className="data-table-scroll"><table className="data-table"><thead><tr><th>Дата</th><th>Тип</th><th>Объём</th><th>Собеседник</th><th>Стоимость</th></tr></thead><tbody>{q.data.items.map((i) => <tr key={i.id}><td>{dateTime(i.occurred_at)}</td><td>{prettyMetric(i.metric)}</td><td>{Number(i.quantity).toLocaleString('ru-RU', { maximumFractionDigits: 2 })} {i.unit}</td><td>{i.peer_number || '—'}</td><td>{money(i.cost_byn)}</td></tr>)}</tbody></table></div> : <EmptyMessage/>}</Card>
      {q.data?.total > limit && <div className="pagination"><Button variant="outline" disabled={page <= 1} onClick={() => setParams({ from: actualFrom, to: actualTo, page: String(page - 1) })}>Назад</Button><span>Страница {page} из {Math.ceil(q.data.total / limit)}</span><Button variant="outline" disabled={page * limit >= q.data.total} onClick={() => setParams({ from: actualFrom, to: actualTo, page: String(page + 1) })}>Вперёд</Button></div>}
    </State></>;
}
export function Topup() {
  const [amount, setAmount] = useState('20.00');
  const [error, setError] = useState(null);
  const keyRef = useRef({ amount: '20.00', key: crypto.randomUUID() });
  const normalized = bynAmount(amount);
  const client = useQueryClient();
  const mutation = useMutation({ mutationFn: async () => {
    if (!normalized || Number(normalized) < 1 || Number(normalized) > 1000) throw new Error('Введите сумму от 1,00 до 1000,00 BYN');
    if (keyRef.current.amount !== normalized) keyRef.current = { amount: normalized, key: crypto.randomUUID() };
    return endpoints.topup(normalized, keyRef.current.key);
  }, onSuccess: (data) => {
    client.invalidateQueries({ queryKey: ['payments'] });
    if (!data?.checkout_url) return setError(new Error('Платёж создан, но сервер не предоставил ссылку на оплату. Проверьте историю платежей.'));
    try {
      const checkout = new URL(data.checkout_url);
      if (!['https:', 'http:'].includes(checkout.protocol)) throw new Error('Недопустимый адрес оплаты');
      window.location.assign(checkout.href);
    } catch { setError(new Error('Провайдер вернул некорректную ссылку оплаты.')); }
  }, onError: setError });
  return <><PageHeading category="Финансы" title="Пополнить баланс" subtitle="Оплата производится на защищённой странице платёжного провайдера"/>
    <Card className="topup-card"><h2><CreditCard size={25}/> Сумма пополнения</h2><form onSubmit={(e) => { e.preventDefault(); setError(null); mutation.mutate(); }}>
      <label className="form-label">Сумма в BYN<input type="text" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="20.00" required /></label>
      <div className="amount-presets">{[10, 20, 30, 50].map((n) => <button type="button" key={n} onClick={() => setAmount(n.toFixed(2))}>{n} BYN</button>)}</div>
      <p className="field-help">Баланс изменится только после успешного подтверждения платежа на стороне сервера.</p><InlineError error={error}/><Button type="submit" loading={mutation.isPending} disabled={!normalized}>Перейти к оплате <ChevronRight size={18}/></Button>
    </form></Card>
  </>;
}
