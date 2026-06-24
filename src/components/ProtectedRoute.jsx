import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useEffect } from "react";
import api from "../api/client";

export const ProtectedRoute = () => {
  const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const location = useLocation();

  useEffect(() => {
    if (isLoggedIn && user.role === 'COWORKER') {
      const fetchPermissions = async () => {
        try {
          const res = await api.get(`/api/admin/coworkers/${user.id}/permissions`);
          localStorage.setItem('permissions', JSON.stringify(res.data));
          window.dispatchEvent(new Event('permissionsUpdated'));
        } catch (error) {
          console.error('Error fetching coworker permissions:', error);
        }
      };
      fetchPermissions();
    }
  }, [isLoggedIn, user.id, user.role, location.pathname]);

  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};
