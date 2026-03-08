import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/landingpage.jsx';
import CustomerServices from './pages/customerservice.jsx';
import CustomerService from './pages/customerservice1.jsx';
import BookingPayment from './pages/paymentsystem.jsx';
import AdminDashboard from './pages/adminDashboard.jsx';
import AdminBooking from './pages/adminBooking.jsx';
import AdminConfiguration from './pages/aiconfiguration.jsx';
import Analytics from './pages/analytics.jsx';
import Settings from './pages/setting.jsx';
import AddBusiness from './pages/addbusiness.jsx';
import AdminLogin from './pages/adminlogin.jsx';
import Login from './auth/login.jsx';
import ForgotPassword from './auth/forgotPassword.jsx';
import ResetPassword from './auth/resetPassword.jsx';
import Profile from './pages/profile.jsx';
import ChangePassword from './auth/changePassword.jsx';
import PaymentSuccess from './pages/paymentSuccess.jsx';
import PaymentCancelled from './pages/paymentCancelled.jsx';
import { PlatformProvider } from './pages/platformContext';
import { PlatformContactProvider } from './pages/platformContact';

function App() {
  return (
    <PlatformProvider>
      <PlatformContactProvider>
        <Router>
          <Routes>
            <Route path="/:business_slug?" element={<LandingPage />} />
            <Route path="/customerservice/:business_slug" element={<CustomerService />} />
            <Route path="/customerservices" element={<CustomerServices />} />
            <Route path="/customerservice" element={<CustomerService />} />
            <Route path="/paymentsystem" element={<BookingPayment />} />
            <Route path="/adminDashboard/*" element={<AdminDashboard />} />
            <Route path="/adminBooking/*" element={<AdminBooking />} />
            <Route path="/aiconfiguration/*" element={<AdminConfiguration />} />
            <Route path="/analytics/*" element={<Analytics />} />
            <Route path="/settings/*" element={<Settings />} />
            <Route path="/addbusiness/*" element={<AddBusiness />} />
            <Route path="/adminlogin/*" element={<AdminLogin />} />
            <Route path="/login/*" element={<Login />} />
            <Route path="/forgot-password/*" element={<ForgotPassword />} />
            <Route path="/reset-password/*" element={<ResetPassword />} />
            <Route path="/profile/*" element={<Profile />} />
            <Route path="/change-password/*" element={<ChangePassword />} />
            <Route path="/payment/success" element={<PaymentSuccess />} />
            <Route path="/payment/cancelled" element={<PaymentCancelled />} />
            <Route path="/payment/cancel" element={<PaymentCancelled />} />
          </Routes>
        </Router>
      </PlatformContactProvider>
    </PlatformProvider>
  );
}

export default App;