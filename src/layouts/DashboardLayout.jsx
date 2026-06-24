import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

export const DashboardLayout = ({ children, title }) => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
    const closeSidebar = () => setIsSidebarOpen(false);

    return (
        <div className="flex min-h-screen bg-slate-50">
            <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} />
            <main className="flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out ml-0 lg:ml-[280px]">
                <Topbar title={title} onMenuClick={toggleSidebar} />
                <div className="p-4 lg:p-8 flex-1 w-full max-w-[1400px] mx-auto">
                    {children}
                </div>
            </main>
        </div>
    );
};
