import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { AlertCircle, Bell, CircleUserRound, LogOut, Mail, Menu, X } from 'lucide-react';
import { endpoints } from '../lib/api';
import { useAuth } from '../auth/AuthProvider';
import { useToast } from './UI';
import logo from '../assets/logo-crop.png';

const navItems = [
  { label: 'Тарифы и услуги', to: '/', match: ['/services', '/tariffs', '/number'] },
  { label: 'Финансы', to: '/finance', match: ['/finance'] },
  { label: 'Профиль', to: '/profile', match: ['/profile'] },
  { label: 'Аналитика', to: '/analytics', match: ['/analytics', '/favorites'] },
];
export default function Shell() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const { logout } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const { data } = useQuery({ queryKey: ['notification-badges'], queryFn: () => endpoints.notifications({ unread_only: true }), refetchInterval: 60_000 });
  const counts = data?.unread || {};
  const doLogout = async () => {
    try { await logout(); navigate('/login', { replace: true }); }
    catch { toast('Не удалось уведомить сервер о выходе. Данные сеанса на устройстве удалены.', 'error'); navigate('/login', { replace: true }); }
  };
  return <div className="app-shell">
    <header className="topbar"><div className="topbar-inner">
      <Link className="logo-link" to="/" aria-label="2D2 — главная"><img src={logo} alt="2D2" /></Link>
      <button className="mobile-toggle icon-button" aria-label="Открыть меню" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X/> : <Menu/>}</button>
      <nav className={`main-nav ${menuOpen ? 'nav-open' : ''}`} aria-label="Основная навигация">
        {navItems.map(({ label, to, match }) => <NavLink end={to === '/'} key={to} to={to} className={({ isActive }) => {
          const active = isActive || match.some((p) => p !== '/' && window.location.pathname.startsWith(p));
          return `main-nav-link ${active ? 'active' : ''}`;
        }} onClick={() => setMenuOpen(false)}>{label}</NavLink>)}
      </nav>
      <div className="top-actions">
        <Link to="/notifications?kind=alert" className="top-icon" title="Предупреждения" aria-label="Предупреждения"><AlertCircle size={27}/>{counts.alerts > 0 && <span className="icon-count">{counts.alerts}</span>}</Link>
        <div className="account-menu-wrapper"><button className="top-icon" title="Профиль" aria-label="Меню профиля" aria-expanded={profileMenuOpen} onClick={() => setProfileMenuOpen((open) => !open)}><CircleUserRound size={28}/></button>
          {profileMenuOpen && <div className="account-dropdown"><Link to="/profile" onClick={() => setProfileMenuOpen(false)}>Мой профиль</Link><Link to="/number" onClick={() => setProfileMenuOpen(false)}>Управление номером</Link><button type="button" onClick={() => { setProfileMenuOpen(false); doLogout(); }}>Выйти из аккаунта</button></div>}
        </div>
        <Link to="/notifications?kind=message" className="top-icon" title="Сообщения" aria-label="Сообщения"><Mail size={27}/>{counts.messages > 0 && <span className="icon-count">{counts.messages}</span>}</Link>
        <button className="top-icon logout-icon" title="Выйти" aria-label="Выйти" onClick={doLogout}><LogOut size={25}/></button>
      </div>
    </div></header>
    <main className="content-wrap"><Outlet /></main>
    <footer className="footer"><span>2D2 · Кабинет абонента</span><Link to="/notifications"><Bell size={14}/> Уведомления</Link></footer>
  </div>;
}
