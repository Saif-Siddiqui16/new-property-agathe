import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

export const OwnerProtectedRoute = () => {
    const isOwnerLoggedIn = localStorage.getItem('isOwnerLoggedIn') === 'true';

    if (!isOwnerLoggedIn) {
        return <Navigate to="/owner/login" replace />;
    }

    return <Outlet />;
};
