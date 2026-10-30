import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { ArrowRight, LockKeyhole, Phone, UserRound } from 'lucide-react';
import { useAuth } from '../auth/AuthProvider';
import { endpoints } from '../lib/api';
import { phoneValid } from '../lib/format';
import { Button, InlineError, useToast } from '../components/UI';
import desktop from '../assets/desktop.webp';

function AuthLayout({ children }) {
  return <div className="auth-page"><div className="auth-illustration" style={{ backgroundImage: `url(${desktop})` }} aria-hidden="true" /><div className="auth-form-zone">{children}</div></div>;
}
export function LoginPage() {
  const { authenticated, login, verifyOtp } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [tab, setTab] = useState('password');
  const [loginValue, setLoginValue] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('+375');
  const [code, setCode] = useState('');
  const [requested, setRequested] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  if (authenticated) return <Navigate to="/" replace />;
  const submit = async (e) => {
    e.preventDefault(); setError(null); setLoading(true);
    try {
      if (tab === 'password') await login(loginValue.trim(), password);
      else { if (!phoneValid(phone)) throw new Error('Укажите номер в формате +375XXXXXXXXX'); await verifyOtp(phone, code); }
      navigate('/', { replace: true });
    } catch (err) { setError(err); }
    finally { setLoading(false); }
  };
  const requestCode = async () => {
    setError(null);
    if (!phoneValid(phone)) return setError(new Error('Укажите номер в формате +375XXXXXXXXX'));
    setLoading(true);
    try { await endpoints.auth.requestOtp(phone, 'login'); setRequested(true); toast('Если номер зарегистрирован, код отправлен по SMS.'); }
    catch (err) { setError(err); }
    finally { setLoading(false); }
  };
  return <AuthLayout><section className="auth-panel"><h1>Вход в аккаунт</h1><h2>Выберите способ авторизации</h2>
    <div className="tabs auth-tabs" role="tablist"><button role="tab" aria-selected={tab === 'password'} className={tab === 'password' ? 'selected' : ''} onClick={() => { setTab('password'); setError(null); }}>Логин и пароль</button><button role="tab" aria-selected={tab === 'phone'} className={tab === 'phone' ? 'selected' : ''} onClick={() => { setTab('phone'); setError(null); }}>Номер телефона</button></div>
    <form onSubmit={submit}>
      {tab === 'password' ? <><label className="form-label">Логин <b>*</b><span className="input-icon"><UserRound size={19}/><input autoComplete="username" value={loginValue} onChange={(e) => setLoginValue(e.target.value)} placeholder="Логин" required /></span></label><label className="form-label">Пароль <b>*</b><span className="input-icon"><LockKeyhole size={19}/><input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Пароль" required /></span></label></> : <><label className="form-label">Номер телефона <b>*</b><span className="input-icon"><Phone size={19}/><input type="tel" autoComplete="tel" value={phone} onChange={(e) => { setPhone(e.target.value); setRequested(false); }} required /></span></label>{requested && <label className="form-label">Код из SMS <b>*</b><input inputMode="numeric" maxLength={6} pattern="[0-9]{6}" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} placeholder="6 цифр" required /></label>}{!requested && <Button type="button" className="otp-request" variant="outline" loading={loading} onClick={requestCode}>Получить SMS-код</Button>}{requested && <button className="text-link minor-link" type="button" disabled={loading} onClick={requestCode}>Отправить код ещё раз</button>}</>}
      <label className="checkbox-line"><input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} required /> Я согласен и принимаю политику конфиденциальности</label>
      <InlineError error={error} />
      <div className="auth-actions"><Button type="submit" loading={loading} disabled={!accepted || (tab === 'phone' && !requested)}>Войти</Button><Link to="/register">Зарегистрироваться <ArrowRight size={20}/></Link></div>
    </form></section></AuthLayout>;
}
export function RegisterPage() {
  const { authenticated, register } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [form, setForm] = useState({ login: '', password: '', full_name: '', email: '', phone: '+375', otp_code: '', privacy_accepted: false });
  const [requested, setRequested] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  if (authenticated) return <Navigate to="/" replace />;
  const change = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const requestCode = async () => {
    setError(null);
    if (!phoneValid(form.phone)) return setError(new Error('Укажите номер в международном формате, например +375291111111'));
    setLoading(true);
    try { await endpoints.auth.requestOtp(form.phone, 'register'); setRequested(true); toast('Код подтверждения отправлен по SMS.'); }
    catch (err) { setError(err); }
    finally { setLoading(false); }
  };
  const submit = async (e) => {
    e.preventDefault(); setError(null);
    if (!requested) return setError(new Error('Сначала запросите SMS-код'));
    if (!phoneValid(form.phone)) return setError(new Error('Неверный формат номера телефона'));
    setLoading(true);
    try { await register({ ...form, login: form.login.trim(), full_name: form.full_name.trim(), email: form.email.trim() || undefined, phone: form.phone.trim() }); navigate('/', { replace: true }); }
    catch (err) { setError(err); }
    finally { setLoading(false); }
  };
  return <AuthLayout><section className="auth-panel register-panel"><h1>Регистрация</h1><h2>Создайте аккаунт абонента 2D2</h2>
    <form onSubmit={submit} className="registration-fields">
      <div className="form-two"><label className="form-label">Логин <b>*</b><input value={form.login} onChange={change('login')} required autoComplete="username" /></label><label className="form-label">ФИО <b>*</b><input value={form.full_name} onChange={change('full_name')} required autoComplete="name" /></label></div>
      <label className="form-label">Пароль <b>*</b><input type="password" value={form.password} onChange={change('password')} required autoComplete="new-password" minLength={8} /></label>
      <label className="form-label">Электронная почта (необязательно)<input type="email" value={form.email} onChange={change('email')} autoComplete="email" /></label>
      <label className="form-label">Номер телефона <b>*</b><input type="tel" value={form.phone} onChange={(e) => { change('phone')(e); setRequested(false); }} required autoComplete="tel" /></label>
      <div className="otp-inline"><label className="form-label">SMS-код <b>*</b><input inputMode="numeric" pattern="[0-9]{6}" maxLength={6} placeholder="123456" value={form.otp_code} onChange={(e) => setForm((f) => ({ ...f, otp_code: e.target.value.replace(/\D/g, '') }))} required /></label><Button variant="outline" type="button" loading={loading} onClick={requestCode}>{requested ? 'Отправить повторно' : 'Получить код'}</Button></div>
      <label className="checkbox-line"><input type="checkbox" checked={form.privacy_accepted} onChange={change('privacy_accepted')} required /> Согласен на обработку персональных данных</label>
      <InlineError error={error}/><div className="auth-actions"><Button type="submit" loading={loading} disabled={!requested || !form.privacy_accepted}>Создать аккаунт</Button><Link to="/login">Уже есть аккаунт <ArrowRight size={20}/></Link></div>
    </form></section></AuthLayout>;
}
