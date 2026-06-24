import React, { useState } from 'react';
import { TenantSidebar } from './TenantSidebar';
import { TenantTopbar } from './TenantTopbar';

export const TenantLayout = ({ children, title = 'Tenant Portal' }) => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
    const closeSidebar = () => setIsSidebarOpen(false);

    return (
        <div className="flex w-full min-h-screen bg-slate-50 overflow-x-hidden">
            <TenantSidebar isOpen={isSidebarOpen} onClose={closeSidebar} />

            <div className="flex flex-col flex-1 min-w-0 transition-all duration-200 ml-0 lg:ml-[260px]">
                <TenantTopbar title={title} onMenuClick={toggleSidebar} />

                <main className="flex-1 w-full max-w-[1400px] mx-auto flex flex-col gap-8 p-4 lg:p-8">
                    {children}
                </main>
            </div>
        </div>
    );
};
