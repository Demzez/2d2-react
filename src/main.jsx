import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './auth/AuthProvider';
import { ToastProvider } from './components/UI';
import App from './App';
import './styles.css';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: (n, err) => n < 1 && err.status !== 401 && err.status !== 403 && err.status !== 404, refetchOnWindowFocus: false } },
});
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter><QueryClientProvider client={queryClient}>
      <AuthProvider><ToastProvider><App /></ToastProvider></AuthProvider>
    </QueryClientProvider></BrowserRouter>
  </React.StrictMode>,
);
