import React, { useState, useEffect } from 'react';
import { Search, Menu, LogOut, MessageSquare } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '../components/Button';
import api from '../api/client';
import clsx from 'clsx';

export const Topbar = ({ title = 'Overview', onMenuClick }) => {
    const navigate = useNavigate();
    const { i18n, t } = useTranslation();
    const [unreadCount, setUnreadCount] = useState(0);

    const handleLogout = () => {
        localStorage.removeItem('isLoggedIn');
        navigate('/login');
    };

    const [selectedProperty, setSelectedProperty] = useState(localStorage.getItem('selectedProperty') || 'masteko');
    const [currentLang, setCurrentLang] = React.useState(i18n.language?.split('-')[0] || 'en');

    const handlePropertyChange = (e) => {
        const val = e.target.value;
        setSelectedProperty(val);
        localStorage.setItem('selectedProperty', val);
        // Clear permissions so we don't use stale ones during loading/syncing
        localStorage.removeItem('permissions');
        // Store timestamp so MainLayout knows to wait for a fresh sync.
        // Timestamp is immune to React StrictMode double-invocation (unlike removeItem flags).
        sessionStorage.setItem('propertySwitchTime', Date.now().toString());
        window.location.reload(); // Reload to refresh all components and API base URLs
    };

    useEffect(() => {
        const fetchUnreadCount = async () => {
            try {
                const res = await api.get('/api/communication/unread-stats');
                setUnreadCount(res.data.count || 0);
            } catch (err) { }
        };

        fetchUnreadCount();
        const interval = setInterval(fetchUnreadCount, 30000); // 30s poll
        return () => clearInterval(interval);
    }, []);

    React.useEffect(() => {
        const syncWithGoogle = () => {
            const masterSelect = document.querySelector("#google_translate_master_container select.goog-te-combo");
            if (masterSelect && masterSelect.value && masterSelect.value !== currentLang) {
                setCurrentLang(masterSelect.value);
                i18n.changeLanguage(masterSelect.value);
            }
        };
        const interval = setInterval(syncWithGoogle, 1000);
        return () => clearInterval(interval);
    }, [currentLang, i18n]);

    const handleLanguageChange = (lang) => {
        i18n.changeLanguage(lang);
        setCurrentLang(lang);
        const masterSelect = document.querySelector("#google_translate_master_container select.goog-te-combo");
        if (masterSelect) {
            masterSelect.value = lang;
            masterSelect.dispatchEvent(new Event("change"));
        }
    };

    return (
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-40 lg:px-4">
            {/* LEFT */}
            <div className="flex items-center gap-4">
                <button
                    className="block lg:hidden text-slate-600 p-2"
                    onClick={onMenuClick}
                >
                    <Menu size={24} />
                </button>

                <div className="flex items-center gap-3">
                    <h1 className="text-lg ml-5 font-semibold text-slate-800 tracking-[-0.01em] whitespace-nowrap">{title || t('navbar.dashboard')}</h1>
                    <select
                        value={selectedProperty}
                        onChange={handlePropertyChange}
                        className="ml-4 h-9 px-3 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 bg-slate-50 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition-all cursor-pointer"
                    >
                        <option value="masteko">Mont-Tremblant</option>
                        <option value="stagathe">St-Agathe</option>
                    </select>
                </div>
            </div>

            {/* RIGHT */}
            <div className="flex items-center gap-4">
                {/* SMS NOTIFICATION */}
                <Link 
                    to="/admin/sms/inbox"
                    className="relative p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all"
                    title="SMS Inbox"
                >
                    <MessageSquare size={20} />
                    {unreadCount > 0 && (
                        <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    )}
                </Link>

                {/* LANGUAGE SWITCHER */}
                <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg p-1 h-10 notranslate">
                    <button
                        onClick={() => handleLanguageChange('en')}
                        className={clsx(
                            "px-3 h-full text-[11px] font-black rounded-md transition-all uppercase tracking-wider",
                            currentLang === 'en' 
                                ? "bg-white text-primary-600 shadow-sm border border-slate-100" 
                                : "text-slate-400 hover:text-slate-600"
                        )}
                    >
                        EN
                    </button>
                    <button
                        onClick={() => handleLanguageChange('fr')}
                        className={clsx(
                            "px-3 h-full text-[11px] font-black rounded-md transition-all uppercase tracking-wider",
                            currentLang === 'fr' 
                                ? "bg-white text-primary-600 shadow-sm border border-slate-100" 
                                : "text-slate-400 hover:text-slate-600"
                        )}
                    >
                        FR
                    </button>
                </div>

                {/* LOGOUT BUTTON */}
                <button
                    className="flex items-center gap-[6px] h-10 px-3 rounded-md border border-slate-200 bg-white text-slate-600 text-sm cursor-pointer transition-all hover:bg-slate-100 hover:text-danger hover:border-slate-300"
                    onClick={handleLogout}
                    title="Logout"
                >
                    <LogOut size={18} />
                    <span className="hidden sm:inline">Logout</span>
                </button>
            </div>
        </header>
    );
};
