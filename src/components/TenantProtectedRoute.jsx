import { Navigate, Outlet } from "react-router-dom";

export const TenantProtectedRoute = () => {
    const isTenantLoggedIn = localStorage.getItem("tenantLoggedIn") === "true";

    if (!isTenantLoggedIn) {
        return <Navigate to="/tenant/login" replace />;
    }

    return <Outlet />;
};
