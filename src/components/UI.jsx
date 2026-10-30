import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { AlertCircle, ArrowLeft, ChevronRight, CircleCheck, LoaderCircle, X } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { money, monthLabel } from '../lib/format';

const ToastContext = createContext(() => {});
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const notify = useCallback((message, type = 'success') => {
    const id = Math.random().toString(36).slice(2);
    setToasts((list) => [...list, { id, message, type }]);
    setTimeout(() => setToasts((list) => list.filter((i) => i.id !== id)), 4500);
  }, []);
  return <ToastContext.Provider value={notify}>{children}<div className="toast-stack" role="status" aria-live="polite">
    {toasts.map(({ id, message, type }) => <div key={id} className={`toast toast-${type}`}>{type === 'success' ? <CircleCheck size={20} /> : <AlertCircle size={20} />}<span>{message}</span><button className="icon-button" aria-label="Закрыть" onClick={() => setToasts((list) => list.filter((i) => i.id !== id))}><X size={16} /></button></div>)}
  </div></ToastContext.Provider>;
}
export const useToast = () => useContext(ToastContext);
export const errorText = (error) => error?.message || 'Не удалось выполнить запрос. Повторите попытку.';
export function Button({ children, loading, icon: Icon, variant = 'primary', className = '', ...props }) {
  return <button className={`btn btn-${variant} ${className}`} {...props} disabled={loading || props.disabled}>{loading ? <LoaderCircle className="spin" size={19} /> : Icon ? <Icon size={18} /> : null}{children}</button>;
}
export function State({ isLoading, error, children, onRetry, empty, emptyText = 'Данных пока нет.' }) {
  if (isLoading) return <div className="state"><LoaderCircle className="spin" size={30} /><p>Загрузка данных…</p></div>;
  if (error) return <div className="state state-error"><AlertCircle size={28} /><p>{errorText(error)}</p>{onRetry && <Button variant="outline" onClick={onRetry}>Повторить</Button>}</div>;
  if (empty) return <div className="state"><p>{emptyText}</p></div>;
  return children;
}
export function Card({ children, className = '', ...rest }) { return <section className={`card ${className}`} {...rest}>{children}</section>; }
export function PageHeading({ title, category, subtitle, right }) {
  const navigate = useNavigate();
  return <div className="page-heading">
    <div><div className="breadcrumbs"><button onClick={() => navigate(-1)} aria-label="Назад"><ArrowLeft size={16} /></button>{category && <><span>{category}</span><ChevronRight size={16}/></>}<span className="muted">{title}</span></div><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>
    {right && <div className="heading-action">{right}</div>}
  </div>;
}
export function NavCard({ title, text, to, onClick, className = '' }) {
  const content = <><span className="nav-card-title">{title}</span><ChevronRight size={22}/>{text && <span className="nav-card-subtitle">{text}</span>}</>;
  return onClick ? <button className={`nav-card ${className}`} onClick={onClick}>{content}</button> : <Link className={`nav-card ${className}`} to={to}>{content}</Link>;
}
export function BalanceCard({ balance, updated, onTopup }) {
  return <Card className="balance-card"><div className="balance-amount">{money(balance)}</div><span className="balance-caption">Баланс на {updated ? new Intl.DateTimeFormat('ru-RU', { timeZone: 'Europe/Minsk', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(updated)) : 'сегодня'}</span><Button onClick={onTopup}>Пополнить баланс</Button></Card>;
}
export function MonthPicker({ value, onChange, label = 'Месяц' }) {
  return <label className="month-select"><span>{label}</span><input aria-label={label} type="month" value={value} onChange={(e) => { if (/^\d{4}-\d{2}$/.test(e.target.value)) onChange(e.target.value); }} /></label>;
}
export function Dialog({ title, children, onClose, actions, wide = false }) {
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  return <div className="modal-overlay" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
    <section className={`modal ${wide ? 'modal-wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}><div className="modal-heading"><h2>{title}</h2><button className="icon-button" onClick={onClose} aria-label="Закрыть"><X /></button></div>{children}{actions && <div className="modal-actions">{actions}</div>}</section>
  </div>;
}
export function Confirm({ title, description, confirmText = 'Подтвердить', loading, onCancel, onConfirm, danger = false }) {
  return <Dialog title={title} onClose={onCancel} actions={<><Button variant="neutral" onClick={onCancel}>Отмена</Button><Button variant={danger ? 'danger' : 'primary'} loading={loading} onClick={onConfirm}>{confirmText}</Button></>}><p className="dialog-description">{description}</p></Dialog>;
}
export function InlineError({ error }) { return error ? <div className="inline-error" role="alert"><AlertCircle size={17}/>{errorText(error)}</div> : null; }
export function StatusPill({ value }) {
  const status = ({ paid: 'Оплачен', partially_paid: 'Частично оплачен', unpaid: 'Не оплачен', pending: 'Обрабатывается', succeeded: 'Успешно', failed: 'Не удалось' })[value] || value;
  return <span className={`status-pill status-${value}`}>{status}</span>;
}
export function MetricTiles({ items }) { return <div className="metric-tiles">{items.map((i) => <div className="metric-tile" key={i.label}><small>{i.label}</small><strong>{i.value}</strong></div>)}</div>; }
export function EmptyMessage({ text = 'Нет записей за выбранный период.' }) { return <div className="empty-message">{text}</div>; }
export function PeriodLabel({ month }) { return <span className="period-label">{monthLabel(month)}</span>; }
