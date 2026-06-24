import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import api from '../api/client';

export const MainLayout = ({ children, title = 'Overview' }) => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const location = useLocation();

    // Re-sync permissions in background on navigation & focus to keep UI up-to-date
    useEffect(() => {
        const syncPermissions = async () => {
            try {
                const userStr = localStorage.getItem('user');
                if (!userStr) return;
                
                const user = JSON.parse(userStr);
                if (user.role === 'COWORKER') {
                    const res = await api.get('/api/admin/my-permissions');
                    if (res.data) {
                        const oldPerms = localStorage.getItem('permissions');
                        const newPerms = JSON.stringify(res.data);
                        
                        // Only update and emit if something actually changed
                        if (oldPerms !== newPerms) {
                            localStorage.setItem('permissions', newPerms);
                            window.dispatchEvent(new Event('permissionsUpdated'));
                        }
                    }
                }
            } catch (error) {
                console.error('Background permission sync failed:', error);
            }
        };

        syncPermissions();
        
        // Also sync when window gets focus (user tabs back) or periodically
        window.addEventListener('focus', syncPermissions);
        const interval = setInterval(syncPermissions, 60000); // Heartbeat sync @ 60s
        
        return () => {
            window.removeEventListener('focus', syncPermissions);
            clearInterval(interval);
        };
    }, [location.pathname]);

    // Toggle Sidebar for mobile view
    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
    const closeSidebar = () => setIsSidebarOpen(false);

    return (
        <div className="flex w-full min-h-screen bg-slate-50 overflow-x-hidden">
            {/* Fixed Sidebar */}
            <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} />

            {/* Main Content Wrapper */}
            <div className="flex flex-col flex-1 min-w-0 transition-all duration-200 ml-0 lg:ml-[260px]">
                {/* Sticky Top Header */}
                <Topbar title={title} onMenuClick={toggleSidebar} />

                {/* Scrollable Page Content */}
                <main className="flex-1 w-full max-w-[1400px] mx-auto flex flex-col gap-8 p-4 lg:p-8">
                    {children}
                </main>
            </div>
        </div>
    );
};
