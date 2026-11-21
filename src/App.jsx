import { Component } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth/AuthProvider.jsx';
import Shell from './components/Shell.jsx';
import { LoginPage, RegisterPage } from './pages/AuthPages.jsx';
import Dashboard from './pages/Dashboard';
import Services from './pages/Services';
import { Tariffs, NumberPage, Profile } from './pages/TariffsNumberProfile.jsx';
import { FinanceHome, Charges, Invoices, InvoiceDetail, Payments, UsageDetails, Topup } from './pages/Finance';
import Analytics from './pages/Analytics';
import Notifications from './pages/Notifications';
import AdminOverview from './pages/AdminOverview.jsx';
import AdminSubscribers from './pages/AdminSubscribers.jsx';
import AdminTariffs from './pages/AdminTariffs.jsx';
import AdminServices from './pages/AdminServices.jsx';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div className="content-wrap">
          <div className="state state-error">
            <h2>Произошла ошибка интерфейса</h2>
            <p>{this.state.error?.message || 'Неизвестная ошибка'}</p>
            <button className="btn btn-primary" onClick={() => window.location.reload()}>Обновить страницу</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function Private({ children }) {
  const { authenticated } = useAuth();
  return authenticated ? children : <Navigate to="/login" replace />;
}

function HomeRoute() {
  const { isAdmin } = useAuth();
  return isAdmin ? <Navigate to="/admin" replace /> : <Dashboard />;
}

function AdminRoute({ children }) {
  const { isAdmin } = useAuth();
  return isAdmin ? children : <Navigate to="/" replace />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route element={<Private><Shell /></Private>}>
          <Route index element={<HomeRoute />} />
          <Route path="/services" element={<Services />} />
          <Route path="/tariffs" element={<Tariffs />} />
          <Route path="/number" element={<NumberPage />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/finance" element={<FinanceHome />} />
          <Route path="/finance/charges" element={<Charges />} />
          <Route path="/finance/invoices" element={<Invoices />} />
          <Route path="/finance/invoices/:id" element={<InvoiceDetail />} />
          <Route path="/finance/payments" element={<Payments />} />
          <Route path="/finance/details" element={<UsageDetails />} />
          <Route path="/finance/topup" element={<Topup />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/notifications" element={<Notifications />} />

          <Route path="/admin" element={<AdminRoute><AdminOverview /></AdminRoute>} />
          <Route path="/admin/subscribers" element={<AdminRoute><AdminSubscribers /></AdminRoute>} />
          <Route path="/admin/tariffs" element={<AdminRoute><AdminTariffs /></AdminRoute>} />
          <Route path="/admin/services" element={<AdminRoute><AdminServices /></AdminRoute>} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ErrorBoundary>
  );
}
