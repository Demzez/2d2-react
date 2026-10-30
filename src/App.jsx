import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth/AuthProvider';
import Shell from './components/Shell';
import { LoginPage, RegisterPage } from './pages/AuthPages';
import Dashboard from './pages/Dashboard';
import Services from './pages/Services';
import { Tariffs, NumberPage, Profile } from './pages/TariffsNumberProfile';
import { FinanceHome, Charges, Invoices, InvoiceDetail, Payments, UsageDetails, Topup } from './pages/Finance';
import Analytics from './pages/Analytics';
import Notifications from './pages/Notifications';

function Private({ children }) {
  const { authenticated } = useAuth();
  return authenticated ? children : <Navigate to="/login" replace />;
}
export default function App() {
  return <Routes>
    <Route path="/login" element={<LoginPage/>}/>
    <Route path="/register" element={<RegisterPage/>}/>
    <Route element={<Private><Shell/></Private>}>
      <Route index element={<Dashboard/>}/>
      <Route path="/services" element={<Services/>}/>
      <Route path="/tariffs" element={<Tariffs/>}/>
      <Route path="/number" element={<NumberPage/>}/>
      <Route path="/profile" element={<Profile/>}/>
      <Route path="/finance" element={<FinanceHome/>}/>
      <Route path="/finance/charges" element={<Charges/>}/>
      <Route path="/finance/invoices" element={<Invoices/>}/>
      <Route path="/finance/invoices/:id" element={<InvoiceDetail/>}/>
      <Route path="/finance/payments" element={<Payments/>}/>
      <Route path="/finance/details" element={<UsageDetails/>}/>
      <Route path="/finance/topup" element={<Topup/>}/>
      <Route path="/analytics" element={<Analytics/>}/>
      <Route path="/notifications" element={<Notifications/>}/>
    </Route>
    <Route path="*" element={<Navigate to="/" replace/>}/>
  </Routes>;
}
