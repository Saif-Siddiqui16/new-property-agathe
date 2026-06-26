import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import api from '../api/client';

// Timestamp-based approach — immune to React StrictMode double-invocation.
// Topbar stores a timestamp in sessionStorage when property is switched.
// We check if the switch happened within the last 15 seconds.
const getInitialPermissionsReady = () => {
    try {
        const switchTime = parseInt(sessionStorage.getItem('propertySwitchTime') || '0');
        if (switchTime && (Date.now() - switchTime) < 15000) {
            return false; // switched recently — wait for fresh sync
        }
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        if (user.role === 'ADMIN') return true;
        if (user.role === 'COWORKER') {
            const perms = JSON.parse(localStorage.getItem('permissions') || '[]');
            return perms.length > 0;
        }
    } catch (e) { /* ignore */ }
    return true;
};

export const MainLayout = ({ children, title = 'Overview' }) => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const location = useLocation();
    const isFirstSync = useRef(true);

    // Start as ready if permissions already exist, otherwise show spinner
    const [permissionsReady, setPermissionsReady] = useState(getInitialPermissionsReady);

    // Clean up the switch timestamp and old flag after mount.
    // (useEffect runs after initial render, so getInitialPermissionsReady has already
    // captured the initial value — safe to clean up now.)
    useEffect(() => {
        sessionStorage.removeItem('propertySwitchTime');
        localStorage.removeItem('propertyJustSwitched');
    }, []);

    useEffect(() => {
        const syncPermissions = async () => {
            const firstSync = isFirstSync.current;
            isFirstSync.current = false;

            try {
                const userStr = localStorage.getItem('user');
                if (!userStr) { if (firstSync) setPermissionsReady(true); return; }

                const user = JSON.parse(userStr);
                if (user.role === 'COWORKER') {
                    const res = await api.get('/api/admin/my-permissions');
                    if (res.data) {
                        const oldPerms = localStorage.getItem('permissions');
                        const newPerms = JSON.stringify(res.data);
                        if (oldPerms !== newPerms) {
                            localStorage.setItem('permissions', newPerms);
                        }
                        // Always fire on first sync so sidebar re-renders with confirmed permissions
                        if (firstSync || oldPerms !== newPerms) {
                            window.dispatchEvent(new Event('permissionsUpdated'));
                        }
                    }
                } else if (firstSync) {
                    // ADMIN: fire once so sidebar confirms render
                    window.dispatchEvent(new Event('permissionsUpdated'));
                }
            } catch (error) {
                console.error('Background permission sync failed:', error);
                if (firstSync) window.dispatchEvent(new Event('permissionsUpdated'));
            } finally {
                // Mark permissions as ready after first sync regardless of outcome
                if (firstSync) setPermissionsReady(true);
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
            {/* Fixed Sidebar — pass permissionsReady so it shows skeleton during sync */}
            <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} permissionsReady={permissionsReady} />

            {/* Main Content Wrapper */}
            <div className="flex flex-col flex-1 min-w-0 transition-all duration-200 ml-0 lg:ml-[260px]">
                {/* Sticky Top Header */}
                <Topbar title={title} onMenuClick={toggleSidebar} />

                {/* Scrollable Page Content — hidden until permissions confirmed */}
                <main className="flex-1 w-full max-w-[1400px] mx-auto flex flex-col gap-8 p-4 lg:p-8">
                    {!permissionsReady ? (
                        <div className="flex items-center justify-center min-h-[60vh]">
                            <div className="flex flex-col items-center gap-3">
                                <div className="w-10 h-10 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
                                <p className="text-sm text-slate-400 font-medium">Loading...</p>
                            </div>
                        </div>
                    ) : children}
                </main>
            </div>
        </div>
    );
};

