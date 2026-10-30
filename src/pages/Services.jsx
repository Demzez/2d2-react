import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal } from 'lucide-react';
import { endpoints } from '../lib/api';
import { money, shortDate } from '../lib/format';
import { Button, Confirm, EmptyMessage, PageHeading, State, useToast } from '../components/UI';

const categories = [ ['all', 'Все категории'], ['internet', 'Интернет'], ['messengers', 'Мессенджеры'], ['calls', 'Звонки'], ['security', 'Безопасность'], ['roaming', 'Роуминг'], ['other', 'Другие'] ];
export default function Services() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('status') === 'available' ? 'available' : 'connected';
  const category = searchParams.get('category') || 'all';
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const [target, setTarget] = useState(null);
  const queryClient = useQueryClient();
  const toast = useToast();
  useEffect(() => { const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300); return () => clearTimeout(timer); }, [search]);
  const changeParam = (name, value) => setSearchParams((prev) => { const next = new URLSearchParams(prev); if (!value || value === 'all') next.delete(name); else next.set(name, value); return next; });
  const query = useQuery({ queryKey: ['services', tab, category, debouncedSearch], queryFn: () => endpoints.services({ status: tab, category: category === 'all' ? undefined : category, search: debouncedSearch }) });
  const mutation = useMutation({ mutationFn: ({ id, enabled }) => endpoints.setService(id, enabled), onSuccess: async () => {
    await Promise.all([queryClient.invalidateQueries({ queryKey: ['services'] }), queryClient.invalidateQueries({ queryKey: ['dashboard'] }), queryClient.invalidateQueries({ queryKey: ['analytics'] })]);
    toast(target?.is_connected ? 'Услуга отключена' : 'Услуга подключена'); setTarget(null);
  }, onError: (err) => toast(err.message, 'error') });
  return <><PageHeading category="Тарифы и услуги" title="Услуги"/>
    <div className="services-toolbar"><label className="search-box"><Search size={25}/><input aria-label="Поиск услуг" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Поиск" /></label>
      <label className="category-select"><SlidersHorizontal size={19}/><select aria-label="Категория услуг" value={category} onChange={(e) => changeParam('category', e.target.value)}>{categories.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
    </div>
    <div className="tabs service-tabs" role="tablist"><button role="tab" aria-selected={tab === 'connected'} className={tab === 'connected' ? 'selected' : ''} onClick={() => changeParam('status', 'connected')}>Подключенные</button><button role="tab" aria-selected={tab === 'available'} className={tab === 'available' ? 'selected' : ''} onClick={() => changeParam('status', 'available')}>Доступные</button></div>
    <State isLoading={query.isLoading} error={query.error} onRetry={query.refetch}><div className="service-list card">
      {query.data?.items?.length ? query.data.items.map((item) => <article className="service-item" key={item.id}>
        <div className="service-about">{item.is_connected && <small className="connection-date">✓ &nbsp;Подключена {shortDate(item.connected_at)}</small>}
          <strong>{item.name}</strong><p>{item.description}</p></div>
        <strong className="service-price">{money(item.monthly_fee_byn)}<span>/мес</span></strong>
        <Button variant={item.is_connected ? 'outline' : 'primary'} onClick={() => setTarget(item)}>{item.is_connected ? 'Отключить' : 'Подключить'}</Button>
      </article>) : <EmptyMessage text={debouncedSearch ? 'Услуги по этому запросу не найдены.' : tab === 'connected' ? 'Подключённых услуг пока нет. Перейдите во вкладку «Доступные».' : 'Нет доступных услуг в этой категории.'}/>} 
    </div></State>
    {target && <Confirm title={target.is_connected ? 'Отключить услугу?' : 'Подключить услугу?'} description={`${target.name}. Абонентская плата: ${money(target.monthly_fee_byn)} в месяц.`} confirmText={target.is_connected ? 'Отключить' : 'Подключить'} danger={target.is_connected} loading={mutation.isPending} onCancel={() => setTarget(null)} onConfirm={() => mutation.mutate({ id: target.id, enabled: !target.is_connected })}/>}
  </>;
}
