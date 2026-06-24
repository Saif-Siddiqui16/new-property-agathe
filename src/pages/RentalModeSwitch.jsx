import React from 'react';
import { MainLayout } from '../layouts/MainLayout';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { AlertTriangle, CheckCircle, ArrowLeft } from 'lucide-react';

export const RentalModeSwitch = () => {
    return (
        <MainLayout title="Switch Rental Mode">
            <div className="max-w-[800px] mx-auto flex flex-col gap-6">

                {/* Current State Info */}
                <Card className="bg-slate-50 border border-slate-200">
                    <div className="text-xs uppercase text-slate-500 font-bold mb-2 tracking-wide">Current Configuration</div>
                    <div className="flex items-center">
                        <span className="inline-block px-3 py-1 rounded-full text-sm font-semibold bg-blue-100 text-blue-700">Full Unit</span>
                        <span className="text-slate-500 text-sm ml-2">Allows 1 active lease for the entire unit.</span>
                    </div>
                </Card>

                {/* Mode Selection */}
                <Card title="Select New Configuration">
                    <div className="flex flex-col gap-4">
                        {/* Option 1: Full Unit */}
                        <div className="flex items-start gap-4 p-4 border border-blue-500 bg-blue-50 rounded-lg cursor-pointer transition-all ring-1 ring-blue-500 shadow-sm">
                            <div className="w-5 h-5 rounded-full border-blue-600 bg-blue-600 shadow-[inset_0_0_0_4px_white] mt-0.5 shrink-0"></div>
                            <div>
                                <h4 className="font-semibold text-slate-900">Full Unit Rental</h4>
                                <p className="text-sm text-slate-500">Single lease for the entire property.</p>
                            </div>
                        </div>

                        {/* Option 2: Bedroom */}
                        <div className="flex items-start gap-4 p-4 border border-slate-200 rounded-lg cursor-pointer transition-all hover:border-blue-300 hover:bg-slate-50">
                            <div className="w-5 h-5 rounded-full border-2 border-slate-300 mt-0.5 shrink-0 bg-white"></div>
                            <div>
                                <h4 className="font-semibold text-slate-900">Bedroom-by-Bedroom</h4>
                                <p className="text-sm text-slate-500">Individual leases per room. Shared common areas.</p>
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Safety Rules */}
                <div className="p-4 bg-amber-50 border border-amber-300 rounded-lg">
                    <div className="flex items-center gap-2 mb-3">
                        <AlertTriangle size={18} className="text-amber-500" />
                        <span className="font-bold text-amber-800">Prerequisites for Switching</span>
                    </div>
                    <ul className="list-none p-0 m-0 flex flex-col gap-2">
                        <li className="flex items-center gap-2 text-sm font-medium text-emerald-600">
                            <CheckCircle size={16} className="text-success" /> No Active Leases
                        </li>
                        <li className="flex items-center gap-2 text-sm text-slate-700">
                            <div className="w-4 h-4 border-2 border-slate-300 rounded-full"></div> No Pending Invoices
                        </li>
                        <li className="flex items-center gap-2 text-sm text-slate-700">
                            <div className="w-4 h-4 border-2 border-slate-300 rounded-full"></div> No Open Maintenance Requests
                        </li>
                    </ul>
                    <p className="text-xs text-amber-700/80 mt-3 font-medium">
                        System prevents switching if these conditions are not met to ensure accounting integrity.
                    </p>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-4 mt-2">
                    <Button variant="ghost" icon={ArrowLeft}>Cancel</Button>
                    <Button variant="primary" disabled>Confirm Switch</Button>
                </div>

            </div>
        </MainLayout>
    );
};
