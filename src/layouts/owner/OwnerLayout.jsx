import React, { useState } from 'react';
import { OwnerSidebar } from './OwnerSidebar';
import { OwnerTopbar } from './OwnerTopbar';

export const OwnerLayout = ({ children, title = "Dashboard" }) => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    return (
        <div className="flex min-h-screen bg-slate-50 selection:bg-indigo-100 selection:text-indigo-900">
            {/* Isolated Sidebar */}
            <OwnerSidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

            <div className="flex-1 flex flex-col min-w-0">
                {/* Isolated Topbar */}
                <OwnerTopbar title={title} onMenuClick={() => setIsSidebarOpen(true)} />

                {/* Main Content Area */}
                <main className="flex-1 p-4 md:p-8 overflow-y-auto">
                    <div className="max-w-[1600px] mx-auto animate-in fade-in duration-500">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
};
