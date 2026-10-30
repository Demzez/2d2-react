import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams, Link } from 'react-router-dom';
import { AlertTriangle, Check, Mail } from 'lucide-react';
import { endpoints } from '../lib/api';
import { dateTime } from '../lib/format';
import { Button, Card, EmptyMessage, PageHeading, State, useToast } from '../components/UI';

export default function Notifications() {
  const [params, setParams] = useSearchParams();
  const kind = ['alert', 'message'].includes(params.get('kind')) ? params.get('kind') : 'all';
  const onlyUnread = params.get('unread_only') === 'true';
  const q = useQuery({ queryKey: ['notifications', kind, onlyUnread], queryFn: () => endpoints.notifications({ kind, unread_only: onlyUnread }) });
  const client = useQueryClient(); const toast = useToast();
  const mutation = useMutation({ mutationFn: endpoints.markRead, onSuccess: async () => {
    await Promise.all([client.invalidateQueries({ queryKey: ['notifications'] }), client.invalidateQueries({ queryKey: ['notification-badges'] }), client.invalidateQueries({ queryKey: ['dashboard'] })]);
  }, onError: (err) => toast(err.message, 'error') });
  const change = (key, value) => setParams((prev) => { const n = new URLSearchParams(prev); if (!value || value === 'all' || value === 'false') n.delete(key); else n.set(key, value); return n; });
  return <><PageHeading title="Уведомления" subtitle="Сообщения оператора и предупреждения о состоянии услуг"/>
    <div className="notification-filters"><div className="tabs"><button className={kind === 'all' ? 'selected' : ''} onClick={() => change('kind', 'all')}>Все</button><button className={kind === 'alert' ? 'selected' : ''} onClick={() => change('kind', 'alert')}>Предупреждения</button><button className={kind === 'message' ? 'selected' : ''} onClick={() => change('kind', 'message')}>Сообщения</button></div><label className="checkbox-line"><input type="checkbox" checked={onlyUnread} onChange={(e) => change('unread_only', String(e.target.checked))}/> Только непрочитанные</label></div>
    <State isLoading={q.isLoading} error={q.error} onRetry={q.refetch}><Card className="notifications-list">{q.data?.items?.length ? q.data.items.map((item) => <article key={item.id} className={`notification-item ${!item.is_read ? 'notification-unread' : ''}`}><span className={`notification-symbol ${item.kind}`}>{item.kind === 'alert' ? <AlertTriangle size={24}/> : <Mail size={24}/>}</span><div className="notification-content"><h2>{item.title}</h2><p>{item.body}</p><small>{dateTime(item.created_at)}</small>{item.target_path?.startsWith('/') && !item.target_path.startsWith('//') && <Link className="text-link" to={item.target_path}>Подробнее</Link>}</div>{!item.is_read && <Button variant="outline" loading={mutation.isPending && mutation.variables === item.id} onClick={() => mutation.mutate(item.id)}><Check size={18}/> Прочитано</Button>}</article>) : <EmptyMessage text="Уведомлений по выбранным условиям нет."/>}</Card></State>
  </>;
}
