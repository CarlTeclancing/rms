import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './layouts/AppLayout.jsx';
import { useAuth } from './context/AuthContext.jsx';
import Dashboard from './pages/Dashboard.jsx';
import BusinessIntelligence from './pages/BusinessIntelligence.jsx';
import Expenses from './pages/Expenses.jsx';
import Login from './pages/Login.jsx';
import Menu from './pages/Menu.jsx';
import OnlineOrders from './pages/OnlineOrders.jsx';
import PublicPortal from './pages/PublicPortal.jsx';
import Promotions from './pages/Promotions.jsx';
import Reports from './pages/Reports.jsx';
import Sales from './pages/Sales.jsx';
import Settings from './pages/Settings.jsx';
import Stock from './pages/Stock.jsx';
import Users from './pages/Users.jsx';

function ProtectedRoute() {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <AppLayout /> : <Navigate to="/login" replace />;
}

export default function App() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route path="/" element={<PublicPortal />} />
      <Route path="/login" element={isAuthenticated ? <Navigate to="/admin" replace /> : <Login />} />
      <Route path="/portal" element={<PublicPortal />} />
      <Route element={<ProtectedRoute />}>
        <Route path="admin" element={<Dashboard />} />
        <Route path="sales" element={<Sales />} />
        <Route path="online-orders" element={<OnlineOrders />} />
        <Route path="menu" element={<Menu />} />
        <Route path="stock" element={<Stock />} />
        <Route path="expenses" element={<Expenses />} />
        <Route path="reports" element={<Reports />} />
        <Route path="business-intelligence" element={<BusinessIntelligence />} />
        <Route path="promotions" element={<Promotions />} />
        <Route path="users" element={<Users />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}
