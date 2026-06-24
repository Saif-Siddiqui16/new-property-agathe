import React from 'react';

/**
 * AccessControl component to conditionally render children based on user permissions.
 * @param {string} module - The name of the module (e.g., 'Tenants', 'Invoices')
 * @param {string} action - The action required ('view', 'add', 'edit', 'delete')
 */
export const AccessControl = ({ module, action, children }) => {
    // Get user info from localStorage
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
    // ADMIN has full access
    if (user.role === 'ADMIN') {
        return <>{children}</>;
    }

    // Only COWORKER role is filtered by these granular permissions for now
    if (user.role !== 'COWORKER') {
        return <>{children}</>;
    }

    const permissions = JSON.parse(localStorage.getItem('permissions') || '[]');
    const perm = permissions.find(p => p.moduleName === module);
    
    if (!perm) return null;

    let hasAccess = false;
    const reqAction = action.toLowerCase();

    if (reqAction === 'view') hasAccess = perm.canView;
    else if (reqAction === 'add') hasAccess = perm.canAdd;
    else if (reqAction === 'edit') hasAccess = perm.canEdit;
    else if (reqAction === 'delete') hasAccess = perm.canDelete;

    return hasAccess ? <>{children}</> : null;
};
