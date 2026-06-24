import React, { useState, useEffect } from 'react';
import { Menu, User, Globe } from 'lucide-react';
import api from '../api/client';

export const TenantTopbar = ({ title = 'Dashboard', onMenuClick }) => {
    const [tenantName, setTenantName] = useState('Tenant');
    const [buildingInfo, setBuildingInfo] = useState('Loading...');
    const [initials, setInitials] = useState('...');
    const [language, setLanguage] = useState('EN');

    // Remote Control Logic (Master version)
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
                const res = await api.get('/api/tenant/profile');
                if (res.data.name) {
                    setTenantName(res.data.name);
                    const inits = res.data.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
                    setInitials(inits);
                }

                const bName = res.data.buildingName || 'No Building';
                const uNum = res.data.unitNumber || '';
                setBuildingInfo(uNum ? `${bName} – ${uNum}` : bName);
            } catch (err) {
                console.error("Failed to fetch tenant profile", err);
                setTenantName('Tenant');
                setInitials('TN');
                setBuildingInfo('');
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
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-40 lg:px-6">
            <div className="flex items-center gap-4">
                <button
                    className="block lg:hidden text-slate-600 p-2"
                    onClick={onMenuClick}
                >
                    <Menu size={24} />
                </button>
                <h1 className="text-lg font-bold text-slate-800 italic uppercase">{title}</h1>
            </div>

            <div className="flex items-center gap-6">

                {/* Language Switcher */}
                <button
                    onClick={toggleLanguage}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-100 hover:bg-indigo-50 hover:border-indigo-100 hover:text-indigo-600 transition-colors group"
                >
                    <Globe size={16} className="text-slate-400 group-hover:text-indigo-500" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-600 group-hover:text-indigo-600">
                        {language}
                    </span>
                </button>

                <div className="flex items-center gap-4 border-l border-slate-100 pl-6">
                    <div className="hidden md:flex flex-col items-end">
                        <span className="text-xs font-black text-slate-800 italic uppercase">{tenantName}</span>
                        <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{buildingInfo}</span>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black shadow-lg shadow-slate-200 shrink-0">
                            {initials}
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
};
