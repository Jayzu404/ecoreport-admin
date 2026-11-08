import { Route, Routes } from "react-router";

import DashboardLayout from "./features/dashboard/layouts/DashboardLayout";
import AnalyticPage from "./features/dashboard/components/AnalyticPage";
import Reports from "./features/dashboard/components/Reports";
import ReportDetailPage from "./features/dashboard/components/ReportDetailPage";
import ReportsMapView from "./features/dashboard/components/ReportsMapView";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./features/auth/Login";
import Signup from "./features/auth/Signup";

import { Toaster } from "react-hot-toast";

const App = () => {
  return (
    <>
      <Toaster position="top-center" />

      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* Protected routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<Reports />} />
            <Route path="analytics" element={<AnalyticPage />} />
            <Route path="reports/:id" element={<ReportDetailPage />} />
            <Route path="reports-map" element={<ReportsMapView />} />
          </Route>
        </Route>
      </Routes>
    </>
  );
};

export default App;
