import { Routes, Route, Navigate } from "react-router-dom";

// Public
import Landing from "../pages/public/Landing";
import Pricing from "../pages/public/Pricing";
import HowItWorks from "../pages/public/HowItWorks";
import Help from "../pages/public/Help";

// Public booking flow
import PublicBooking from "../pages/public/PublicBooking";
import PublicServiceBooking from "../pages/public/PublicServiceBooking";
import PublicConfirmation from "../pages/public/PublicConfirmation";
import RescheduleBooking from "../pages/public/RescheduleBooking";
import GetStarted from "../pages/public/GetStarted";
import BusinessLogin from "../pages/public/BusinessLogin";
import BusinessRegister from "../pages/public/BusinessRegister";
import BusinessAccount from "../pages/public/BusinessAccount";
import PublicLayout from "../layouts/PublicLayout";

// Auth
import Login from "../pages/auth/Login";
import Signup from "../pages/auth/Signup";
import BusinessOnboarding from "../pages/auth/BusinessOnboarding";
import CustomerLogin from "../pages/auth/CustomerLogin";
import CustomerRegister from "../pages/auth/CustomerRegister";
import ForgotPassword from "../pages/auth/ForgotPassword";
import ResetPassword from "../pages/auth/ResetPassword";
import StaffLogin from "../pages/auth/StaffLogin";
import AuthPage from "../components/common/AuthPage";

// Business
import BusinessLayout from "../layouts/BusinessLayout";
import BusinessDashboard from "../pages/business/Dashboard";
import BusinessServices from "../pages/business/Services";
import BusinessLocations from "../pages/business/Locations";
import BusinessStaff from "../pages/business/Staff";
import BusinessAvailability from "../pages/business/Availability";
import BusinessAppointments from "../pages/business/Appointments";
import BusinessCalendar from "../pages/business/Calendar";
import BusinessAnalytics from "../pages/business/Analytics";
import BusinessSettings from "../pages/business/Settings";
import BusinessBilling from "../pages/business/Billing";
import BusinessProfile from "../pages/business/Profile";
import Placeholder from "../pages/business/Placeholder";

// Customer
import CustomerDashboard from "../pages/customer/Dashboard";
import CustomerProfile from "../pages/customer/Profile";

// Staff
import StaffLayout from "../layouts/StaffLayout";
import StaffDashboard from "../pages/staff/Dashboard";
import StaffSchedule from "../pages/staff/Schedule";
import StaffHours from "../pages/staff/Hours";
import StaffTimeOff from "../pages/staff/TimeOff";
import StaffProfile from "../pages/staff/Profile";

// Admin
import AdminLogin from "../pages/admin/Login";
import AdminLayout from "../layouts/AdminLayout";
import AdminDashboard from "../pages/admin/Dashboard";
import AdminBusinesses from "../pages/admin/Businesses";
import AdminBusinessDetail from "../pages/admin/BusinessDetail";
import AdminPlans from "../pages/admin/Plans";
import AdminSupport from "../pages/admin/Support";
import AdminAuditLogs from "../pages/admin/AuditLogs";
import AdminAdmins from "../pages/admin/Admins";
import AdminProfile from "../pages/admin/Profile";

// Guards
import ProtectedRoute from "./ProtectedRoute";
import AdminRoute from "./AdminRoute";
import StaffRoute from "./StaffRoute";

export default function AppRoutes() {
  return (
    <Routes>
      {/* ---------- Public marketing ---------- */}
      <Route path="/" element={<Landing />} />
      <Route path="/pricing" element={<Pricing />} />
      <Route path="/how-it-works" element={<HowItWorks />} />
      <Route path="/help" element={<Help />} />

      {/* ---------- Auth ---------- */}
      <Route path="/login" element={<AuthPage><Login /></AuthPage>} />
      <Route path="/signup" element={<AuthPage><Signup /></AuthPage>} />
      <Route path="/customer/login" element={<AuthPage><CustomerLogin /></AuthPage>} />
      <Route path="/customer/register" element={<AuthPage><CustomerRegister /></AuthPage>} />
      <Route path="/forgot-password" element={<AuthPage><ForgotPassword audience="business" /></AuthPage>} />
      <Route path="/customer/forgot-password" element={<AuthPage><ForgotPassword audience="customer" /></AuthPage>} />
      <Route path="/reset-password" element={<AuthPage><ResetPassword /></AuthPage>} />
      <Route path="/staff/login" element={<AuthPage><StaffLogin /></AuthPage>} />
      <Route path="/admin/login" element={<AdminLogin />} />

      {/* ---------- Public booking ---------- */}
      <Route path="/book/:businessSlug" element={<PublicLayout />}>
        <Route index element={<PublicBooking />} />
        <Route path="login" element={<BusinessLogin />} />
        <Route path="register" element={<BusinessRegister />} />
        <Route path="account" element={<BusinessAccount />} />
        <Route path="service/:serviceId" element={<PublicServiceBooking />} />
        <Route path="service/:serviceId/get-started" element={<GetStarted />} />
        <Route path="confirmation/:reference" element={<PublicConfirmation />} />
        <Route path="reschedule/:reference" element={<RescheduleBooking />} />
      </Route>

      {/* ---------- Business portal ---------- */}
      <Route
        path="/onboarding/business"
        element={<ProtectedRoute kind="business"><BusinessOnboarding /></ProtectedRoute>}
      />
      <Route
        path="/dashboard"
        element={<ProtectedRoute kind="business"><BusinessLayout /></ProtectedRoute>}
      >
        <Route index element={<BusinessDashboard />} />
        <Route path="services" element={<BusinessServices />} />
        <Route path="locations" element={<BusinessLocations />} />
        <Route path="staff" element={<BusinessStaff />} />
        <Route path="availability" element={<BusinessAvailability />} />
        <Route path="appointments" element={<BusinessAppointments />} />
        <Route path="calendar" element={<BusinessCalendar />} />
        <Route path="analytics" element={<BusinessAnalytics />} />
        <Route path="settings" element={<BusinessSettings />} />
        <Route path="billing" element={<BusinessBilling />} />
        <Route path="payments" element={<Placeholder titleKey="payments.title" phase="Phase 7" />} />
        <Route path="profile" element={<BusinessProfile />} />
      </Route>

      {/* ---------- Customer ---------- */}
      <Route
        path="/customer/dashboard"
        element={<ProtectedRoute kind="customer"><CustomerDashboard /></ProtectedRoute>}
      />

      {/* ---------- Staff portal ---------- */}
      <Route
        path="/staff"
        element={<StaffRoute><StaffLayout /></StaffRoute>}
      >
        <Route index element={<StaffDashboard />} />
        <Route path="schedule" element={<StaffSchedule />} />
        <Route path="hours" element={<StaffHours />} />
        <Route path="time-off" element={<StaffTimeOff />} />
        <Route path="profile" element={<StaffProfile />} />
      </Route>

      {/* ---------- Admin portal ---------- */}
      <Route
        path="/admin"
        element={<AdminRoute><AdminLayout /></AdminRoute>}
      >
        <Route index element={<AdminDashboard />} />
        <Route path="businesses" element={<AdminBusinesses />} />
        <Route path="businesses/:id" element={<AdminBusinessDetail />} />
        <Route path="plans" element={<AdminPlans />} />
        <Route path="support" element={<AdminSupport />} />
        <Route path="audit" element={<AdminAuditLogs />} />
        <Route path="admins" element={<AdminAdmins />} />
        <Route path="profile" element={<AdminProfile />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}