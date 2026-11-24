import { lazy, Suspense } from 'react';
import { Loading } from './components/Loading.jsx';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './layouts/AppLayout.jsx';
import { useAuth } from './context/AuthContext.jsx';
const Dashboard = lazy(() => import('./pages/Dashboard.jsx'));
const Debtors = lazy(() => import('./pages/Debtors.jsx'));
const BusinessIntelligence = lazy(() => import('./pages/BusinessIntelligence.jsx'));
const Expenses = lazy(() => import('./pages/Expenses.jsx'));
const Login = lazy(() => import('./pages/Login.jsx'));
const Menu = lazy(() => import('./pages/Menu.jsx'));
const Marketing = lazy(() => import('./pages/Marketing.jsx'));
const OnlineOrders = lazy(() => import('./pages/OnlineOrders.jsx'));
import PublicPortal from './pages/PublicPortal.jsx';
const Promotions = lazy(() => import('./pages/Promotions.jsx'));
const Reports = lazy(() => import('./pages/Reports.jsx'));
const Sales = lazy(() => import('./pages/Sales.jsx'));
const SalesHistory = lazy(() => import('./pages/SalesHistory.jsx'));
const Settings = lazy(() => import('./pages/Settings.jsx'));
const Stock = lazy(() => import('./pages/Stock.jsx'));
const Users = lazy(() => import('./pages/Users.jsx'));

function ProtectedRoute() {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <AppLayout /> : <Navigate to="/login" replace />;
}

export default function App() {
  const { isAuthenticated } = useAuth();

  return (
    <Suspense fallback={<Loading label="Loading page" />}><Routes>
      <Route path="/" element={<PublicPortal />} />
      <Route path="/login" element={isAuthenticated ? <Navigate to="/admin" replace /> : <Login />} />
      <Route path="/portal" element={<PublicPortal />} />
      <Route element={<ProtectedRoute />}>
        <Route path="admin" element={<Dashboard />} />
        <Route path="sales" element={<Sales />} />
        <Route path="online-orders" element={<OnlineOrders />} />
        <Route path="history" element={<SalesHistory />} />
        <Route path="debtors" element={<Debtors />} />
        <Route path="menu" element={<Menu />} />
        <Route path="marketing" element={<Marketing />} />
        <Route path="stock" element={<Stock />} />
        <Route path="expenses" element={<Expenses />} />
        <Route path="reports" element={<Reports />} />
        <Route path="business-intelligence" element={<BusinessIntelligence />} />
        <Route path="promotions" element={<Promotions />} />
        <Route path="users" element={<Users />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes></Suspense>
  );
}
