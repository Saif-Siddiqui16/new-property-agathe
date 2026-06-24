import React, { useState, useEffect } from 'react';
import { User, Menu, Globe } from 'lucide-react';
import api from '../../api/client';

export const OwnerTopbar = ({ title, onMenuClick }) => {
    const [ownerName, setOwnerName] = useState('Loading...');
    const [ownerInitials, setOwnerInitials] = useState('...');
    const [language, setLanguage] = useState('EN');

    // Remote Control Logic
    const toggleLanguage = () => {
        const newLangCode = language === 'EN' ? 'fr' : 'en';
        const newLangDisplay = language === 'EN' ? 'FR' : 'EN';
        setLanguage(newLangDisplay);

        // Talk to the Master Hidden instance
        const masterSelect = document.querySelector("#google_translate_master_container select.goog-te-combo");
        if (masterSelect) {
            masterSelect.value = newLangCode;
            masterSelect.dispatchEvent(new Event('change'));
        }
    };

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const res = await api.get('/api/owner/profile');
                if (res.data.name) {
                    setOwnerName(res.data.name);
                    const initials = res.data.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
                    setOwnerInitials(initials);
                }
            } catch (err) {
                console.error("Failed to fetch owner profile", err);
                setOwnerName('Owner');
                setOwnerInitials('OW');
            }
        };
        fetchProfile();
    }, []);

    useEffect(() => {
        const syncWithMaster = () => {
            const masterSelect = document.querySelector("#google_translate_master_container select.goog-te-combo");
            if (masterSelect) {
                const currentGoogleLang = masterSelect.value === 'fr' ? 'FR' : 'EN';
                if (currentGoogleLang !== language) {
                    setLanguage(currentGoogleLang);
                }
            }
        };

        const interval = setInterval(syncWithMaster, 1000);
        return () => clearInterval(interval);
    }, [language]);

    return (
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-100 flex items-center justify-between px-4 md:px-8 sticky top-0 z-40">
            <div className="flex items-center gap-4">
                <button
                    onClick={onMenuClick}
                    className="lg:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors"
                >
                    <Menu size={24} />
                </button>

                <div className="flex flex-col">
                    <h2 className="text-lg md:text-xl font-bold text-slate-900 tracking-tight truncate max-w-[150px] md:max-w-none">{title}</h2>
                </div>
            </div>

            <div className="flex items-center gap-3 md:gap-6">
                <button
                    onClick={toggleLanguage}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-100 hover:bg-indigo-50 hover:border-indigo-100 hover:text-indigo-600 transition-colors group"
                >
                    <Globe size={16} className="text-slate-400 group-hover:text-indigo-500" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-600 group-hover:text-indigo-600">
                        {language}
                    </span>
                </button>

                <div className="flex items-center gap-2 md:gap-4 md:border-l md:border-slate-100 md:pl-6">
                    <div className="flex items-center gap-3 md:pl-2 group cursor-default">
                        <div className="text-right hidden sm:block">
                            <p className="text-xs font-bold text-slate-800">{ownerName}</p>
                        </div>
                        <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black group-hover:scale-110 transition-transform duration-300 shadow-lg shadow-slate-200 shrink-0">
                            {ownerInitials}
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
};
