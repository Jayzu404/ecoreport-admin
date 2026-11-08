import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/useAuth";

const ProtectedRoute = () => {
  const { user, loading } = useAuth();

  // Wait until Firebase checks authentication
  if (loading) {
    return <p>Checking authentication...</p>;
  }

  // Redirect unauthenticated users
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Allow authenticated users
  return <Outlet />;
};

export default ProtectedRoute;  