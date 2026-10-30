export const money = (value) => `${new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value || 0))} BYN`;
export const shortMoney = (value) => new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value || 0));
export const dateTime = (value) => value ? new Intl.DateTimeFormat('ru-RU', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Europe/Minsk' }).format(new Date(value)) : '—';
export const shortDate = (value) => value ? new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Europe/Minsk' }).format(new Date(value)) : '—';
export const currentMonth = () => new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', timeZone: 'Europe/Minsk' }).format(new Date()).slice(0, 7);
export const monthLabel = (value) => {
  if (!/^\d{4}-\d{2}$/.test(String(value))) return value || '—';
  return new Intl.DateTimeFormat('ru-RU', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${value}-01T12:00:00Z`));
};
export const monthsShort = (value) => value ? new Intl.DateTimeFormat('ru-RU', { month: 'short', timeZone: 'UTC' }).format(new Date(`${value}-01T12:00:00Z`)) : '';
export const gb = (mb) => `${(Number(mb || 0) / 1024).toLocaleString('ru-RU', { maximumFractionDigits: 1 })} ГБ`;
export const prettyMetric = (metric) => ({ internet_mb: 'Интернет', messenger_mb: 'Мессенджеры', minutes_own: 'Минуты внутри сети', minutes_other: 'Минуты в другие сети' })[metric] || metric;
export const phoneValid = (phone) => /^\+[1-9]\d{7,14}$/.test(phone);
export const bynAmount = (value) => /^\d+(?:[.,]\d{1,2})?$/.test(String(value).trim()) ? Number(String(value).replace(',', '.')).toFixed(2) : null;
