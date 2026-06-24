import React from 'react';
import { Mail, MessageCircle, HelpCircle, PhoneCall, ArrowRight } from 'lucide-react';

export const Support = () => {
    return (
        <div className="min-h-screen bg-slate-50 py-16 px-4">
            <div className="max-w-4xl mx-auto space-y-8">
                
                {/* HERO SECTION */}
                <div className="bg-blue-600 rounded-[32px] p-10 text-white shadow-xl shadow-blue-100 flex flex-col md:flex-row justify-between items-center gap-8">
                    <div className="space-y-4 text-center md:text-left">
                        <h1 className="text-4xl font-black tracking-tight">App Support Center</h1>
                        <p className="text-blue-100 text-lg font-medium max-w-md">
                            Need help with the Campus Habitations Tenant App? Our team is here to assist you.
                        </p>
                    </div>
                    <div className="bg-white/10 p-6 rounded-2xl backdrop-blur-md border border-white/20">
                        <div className="text-sm font-bold uppercase tracking-widest opacity-80 mb-2">Support Email</div>
                        <div className="flex items-center gap-3 text-xl font-bold italic">
                            <Mail size={24} />
                            administration@campushabitations.com
                        </div>
                    </div>
                </div>

                {/* HELP CARDS */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all">
                        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-6">
                            <HelpCircle size={28} />
                        </div>
                        <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight mb-2">Account Access</h3>
                        <p className="text-slate-500 text-sm font-medium leading-relaxed">
                            Trouble logging in or need to reset your password? Contact us for account recovery.
                        </p>
                    </div>

                    <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all">
                        <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-6">
                            <MessageCircle size={28} />
                        </div>
                        <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight mb-2">Maintenance</h3>
                        <p className="text-slate-500 text-sm font-medium leading-relaxed">
                            Learn how to submit and track your work orders directly through the mobile app.
                        </p>
                    </div>

                    <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all">
                        <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center mb-6">
                            <PhoneCall size={28} />
                        </div>
                        <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight mb-2">Billing Support</h3>
                        <p className="text-slate-500 text-sm font-medium leading-relaxed">
                            Questions about your lease, invoices, or security deposit allocations.
                        </p>
                    </div>
                </div>

            </div>
        </div>
    );
};
