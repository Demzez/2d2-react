import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Check, LockKeyhole, Smartphone, UserRound } from 'lucide-react';
import { endpoints } from '../lib/api.js';
import { gb, money } from '../lib/format';
import { Button, Card, Confirm, InlineError, PageHeading, State, useToast } from '../components/UI';

export function Tariffs() {
  const q = useQuery({ queryKey: ['tariffs'], queryFn: endpoints.tariffs });
  const [target, setTarget] = useState(null);
  const toast = useToast(); const client = useQueryClient();
  const mutation = useMutation({ mutationFn: endpoints.changeTariff, onSuccess: async () => {
    await Promise.all(['tariffs', 'dashboard', 'me', 'finance-summary'].map((key) => client.invalidateQueries({ queryKey: [key] })));
    toast('Тариф успешно изменён'); setTarget(null);
  }, onError: (err) => toast(err.message, 'error') });
  return <><PageHeading category="Тарифы и услуги" title="Тарифный план" subtitle="Выберите тариф. Новый тариф вступит в силу сразу после подтверждения." />
    <State isLoading={q.isLoading} error={q.error} onRetry={q.refetch}><div className="tariff-grid">
      {q.data?.items?.map((t) => <Card key={t.id} className={`tariff-card ${t.is_current ? 'current-tariff' : ''}`}>
        {t.is_current && <span className="small-tag"><Check size={15}/> Текущий тариф</span>}
        <h2>{t.name}</h2><p>{t.description}</p><div className="tariff-data"><strong>{money(t.monthly_fee_byn)}</strong><span>ежемесячно</span></div>
        <div className="tariff-internet"><Smartphone size={19}/> Включено: {gb(t.included_internet_mb)} интернета</div>
        <Button variant={t.is_current ? 'neutral' : 'primary'} disabled={t.is_current} onClick={() => setTarget(t)}>{t.is_current ? 'Подключён' : 'Выбрать тариф'}</Button>
      </Card>)}
    </div></State>
    {target && <Confirm title="Подтверждение смены тарифа" description={`Перейти на тариф «${target.name}» с платой ${money(target.monthly_fee_byn)} в месяц? Перерасчёт за часть текущего месяца не предусмотрен.`} confirmText="Сменить тариф" loading={mutation.isPending} onCancel={() => setTarget(null)} onConfirm={() => mutation.mutate(target.id)} />}
  </>;
}
export function NumberPage() {
  const q = useQuery({ queryKey: ['me'], queryFn: endpoints.me });
  const number = q.data?.number;
  const [nickname, setNickname] = useState('');
  const [confirmBlocking, setConfirmBlocking] = useState(false);
  const toast = useToast(); const client = useQueryClient();
  useEffect(() => { if (number?.nickname != null) setNickname(number.nickname); }, [number?.nickname]);
  const mutation = useMutation({ mutationFn: endpoints.updateNumber, onSuccess: async () => { await client.invalidateQueries({ queryKey: ['me'] }); toast('Настройки номера сохранены'); setConfirmBlocking(false); }, onError: (err) => toast(err.message, 'error') });
  const anyBlocked = Boolean(number?.is_blocked || number?.admin_blocked);
  return <><PageHeading category="Тарифы и услуги" title="Управление номером"/><State isLoading={q.isLoading} error={q.error} onRetry={q.refetch}>
    <div className="settings-grid"><Card className="settings-card"><h2>Мой номер</h2><p className="field-help">Номер телефона: <strong>{number?.msisdn}</strong></p><p className="field-help">Лицевой счёт: <strong>{number?.account_number}</strong></p>
      <form onSubmit={(e) => { e.preventDefault(); mutation.mutate({ nickname: nickname.trim() }); }}><label className="form-label">Название номера<input value={nickname} onChange={(e) => setNickname(e.target.value)} maxLength={80} required /></label><Button type="submit" loading={mutation.isPending}>Сохранить название</Button></form></Card>
      <Card className="settings-card"><h2>Статус номера</h2><div className="number-status"><LockKeyhole size={24}/><span>{number?.admin_blocked ? 'Заблокирован администратором' : number?.is_blocked ? 'Номер заблокирован' : 'Номер активен'}</span></div><p>{number?.admin_blocked ? 'Номер заблокирован администратором оператора. Самостоятельная разблокировка недоступна.' : 'Блокировка запрещает подключать новые услуги и использовать трафик. Статус хранится в кабинете оператора.'}</p><Button variant={number?.is_blocked ? 'primary' : 'outline'} disabled={Boolean(number?.admin_blocked)} onClick={() => setConfirmBlocking(true)}>{number?.is_blocked ? 'Разблокировать номер' : 'Заблокировать номер'}</Button></Card></div>
  </State>{confirmBlocking && <Confirm title={number?.is_blocked ? 'Разблокировать номер?' : 'Заблокировать номер?'} description={number?.is_blocked ? 'Использование услуг будет снова разрешено.' : 'Подключение услуг и потребление трафика будут временно запрещены.'} confirmText={number?.is_blocked ? 'Разблокировать' : 'Заблокировать'} danger={!number?.is_blocked} loading={mutation.isPending} onCancel={() => setConfirmBlocking(false)} onConfirm={() => mutation.mutate({ is_blocked: !number.is_blocked })}/>}
  </>;
}
export function Profile() {
  const q = useQuery({ queryKey: ['me'], queryFn: endpoints.me });
  const user = q.data?.user;
  const [fullName, setFullName] = useState(''); const [email, setEmail] = useState('');
  const [error, setError] = useState(null);
  const toast = useToast(); const client = useQueryClient();
  useEffect(() => { setFullName(user?.full_name || ''); setEmail(user?.email || ''); }, [user?.full_name, user?.email]);
  const mutation = useMutation({ mutationFn: endpoints.updateMe, onSuccess: async () => { await client.invalidateQueries({ queryKey: ['me'] }); toast('Профиль сохранён'); setError(null); }, onError: setError });
  return <><PageHeading title="Профиль" subtitle="Личные данные абонента и информация о лицевом счёте"/>
    <State isLoading={q.isLoading} error={q.error} onRetry={q.refetch}><div className="settings-grid"><Card className="settings-card"><h2><UserRound size={25}/> Личные данные</h2>
      <form onSubmit={(e) => { e.preventDefault(); setError(null); mutation.mutate({ full_name: fullName.trim(), email: email.trim() }); }}>
        <label className="form-label">Логин<input value={user?.login || ''} disabled /></label><label className="form-label">ФИО<input value={fullName} required onChange={(e) => setFullName(e.target.value)}/></label><label className="form-label">Электронная почта<input type="email" value={email} onChange={(e) => setEmail(e.target.value)}/></label><InlineError error={error}/><Button type="submit" loading={mutation.isPending}>Сохранить изменения</Button>
      </form></Card><Card className="settings-card"><h2><Smartphone size={25}/> Информация о номере</h2><p>Номер телефона</p><h3>{q.data?.number?.msisdn}</h3><p>Лицевой счёт</p><h3>{q.data?.number?.account_number}</h3><p>Название: {q.data?.number?.nickname || 'Мой номер'}</p><p>Статус: {q.data?.number?.admin_blocked ? 'Заблокирован администратором' : q.data?.number?.is_blocked ? 'Заблокирован' : 'Активен'}</p><Link className="btn btn-outline" to="/number">Управление номером</Link></Card></div></State>
  </>;
}
