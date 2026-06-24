import React from 'react';

export const PrivacyPolicy = () => {
    return (
        <div className="min-h-screen bg-slate-50 py-16 px-4">
            <div className="max-w-3xl mx-auto bg-white rounded-[24px] shadow-sm border border-slate-100 overflow-hidden">
                {/* Header Section */}
                <div className="p-8 border-b border-slate-50 bg-slate-50/50">
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight">Privacy Policy</h1>
                    <p className="text-sm text-slate-400 font-medium mt-1 uppercase tracking-widest">
                        Last Updated: April 2026
                    </p>
                </div>

                {/* Content Section */}
                <div className="p-10 space-y-8 text-slate-600 leading-relaxed font-medium">
                    
                    <section>
                        <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight mb-3">1. Information We Collect</h2>
                        <p>
                            To provide our property management services via our mobile and web applications, we collect the following information:
                        </p>
                        <ul className="list-disc ml-6 mt-3 space-y-2">
                            <li>Personal identifiers (Registered Name, Phone Number).</li>
                            <li>Property details (Unit Number, Lease start/end dates).</li>
                            <li>Log data (IP address, device type, and app usage statistics).</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight mb-3">2. How We Use Your Data</h2>
                        <p>Your data is used strictly for technical and operational purposes, including:</p>
                        <ul className="list-disc ml-6 mt-3 space-y-2">
                            <li>Facilitating rent payments and invoice tracking.</li>
                            <li>Processing maintenance tickets and communication with property managers.</li>
                            <li>Ensuring compliance with insurance and vehicle registration requirements.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight mb-3">3. Data Security</h2>
                        <p>
                            We implement industry-standard security measures, including SSL encryption and secure database protocols, to protect your information. 
                            We do not store full credit card numbers on our servers; all payments are handled by secure, PCI-compliant third-party processors.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight mb-3">4. Your Rights</h2>
                        <p>
                            You have the right to access, correct, or request the deletion of your personal data at any time. 
                            To exercise these rights, please contact the Property Management office through the contact details provided in your lease agreement.
                        </p>
                    </section>

                    <section className="pt-6 border-t border-slate-100">
                        <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight mb-3">5. Contact Support</h2>
                        <p>For questions regarding this policy or our data practices, please contact your designated Property Administrator or the main management office.</p>
                    </section>

                </div>

                {/* Footer Section */}
                <div className="p-6 bg-slate-50/50 text-center border-t border-slate-50">
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                        © 2026 Property Management System • All Rights Reserved
                    </p>
                </div>
            </div>
        </div>
    );
};
