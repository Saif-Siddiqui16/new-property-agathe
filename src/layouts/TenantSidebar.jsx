import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import {
    LayoutDashboard,
    FileText,
    CreditCard,
    Files,
    ShieldCheck,
    Wrench,
    LogOut,
    X,
    CreditCard as PaymentIcon,
    MessageSquare,
    BarChart3,
    Car
} from "lucide-react";
import clsx from "clsx";

const TENANT_NAV_ITEMS = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/tenant/dashboard" },
    { icon: FileText, label: "My Lease", path: "/tenant/lease" },
    { icon: PaymentIcon, label: "My Invoices", path: "/tenant/invoices" },
    { icon: CreditCard, label: "Pay Rent", path: "/tenant/payments" },
    { icon: Files, label: "My Documents", path: "/tenant/documents" },
    { icon: ShieldCheck, label: "Insurance", path: "/tenant/insurance" },
    { icon: Wrench, label: "Maintenance Tickets", path: "/tenant/tickets" },
    { icon: MessageSquare, label: "Messages", path: "/tenant/communication" },
    { icon: Car, label: "My Vehicles", path: "/tenant/vehicles" },
    { icon: BarChart3, label: "Reports", path: "/tenant/reports" },
];

export const TenantSidebar = ({ isOpen, onClose }) => {
    const handleLogout = () => {
        localStorage.removeItem("tenantLoggedIn");
        window.location.href = "/tenant/login";
    };

    return (
        <>
            <div
                className={clsx(
                    "fixed inset-0 bg-black/40 z-40 lg:hidden transition-opacity duration-300",
                    isOpen ? "opacity-100 block" : "opacity-0 hidden"
                )}
                onClick={onClose}
            />

            <aside className={clsx(
                "fixed left-0 top-0 h-screen w-[260px] bg-white border-r border-slate-100 shadow-xl z-50 transition-transform duration-300 ease-in-out flex flex-col",
                isOpen ? "translate-x-0" : "-translate-x-full",
                "lg:translate-x-0"
            )}>
                <div className="h-20 flex items-center px-6 justify-between border-b border-slate-100 shrink-0">
                    <div className="flex items-center gap-2">
                        <img src="/assets/logo.png" alt="Masteko Logo" className="h-10 w-auto object-container" />
                    </div>
                    <button className="lg:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-md transition" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-1 custom-scrollbar flex flex-col">
                    <div className="flex-1 space-y-1">
                        {TENANT_NAV_ITEMS.map((item) => (
                            <NavLink
                                key={item.label}
                                to={item.path}
                                onClick={onClose}
                                className={({ isActive }) =>
                                    clsx(
                                        "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 group relative",
                                        isActive
                                            ? "bg-primary-50 text-priority-600 shadow-sm border border-primary-100/50"
                                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                                        isActive && "after:absolute after:left-0 after:top-1/2 after:-translate-y-1/2 after:h-8 after:w-1 after:bg-primary-600 after:rounded-r-full"
                                    )
                                }
                            >
                                <item.icon size={20} />
                                <span>{item.label}</span>
                            </NavLink>
                        ))}
                    </div>

                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-600 transition-all duration-200 mt-auto border border-transparent hover:border-red-100"
                    >
                        <LogOut size={20} />
                        <span>Logout</span>
                    </button>
                </nav>
            </aside>
        </>
    );
};
