import React from 'react';
import { MainLayout } from '../layouts/MainLayout';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { AlertCircle, Plus } from 'lucide-react';

export const BedroomSetup = () => {
    return (
        <MainLayout title="Bedroom Setup">
            <div className="flex flex-col gap-6 max-w-[1000px] mx-auto">

                {/* Informational Note */}
                <div className="flex items-center gap-3 p-4 bg-indigo-50 border border-indigo-100 rounded-md text-indigo-800 text-sm">
                    <AlertCircle size={20} className="text-indigo-600" />
                    <p>
                        <strong>Note:</strong> Bedrooms must be defined even for Full Unit rentals to ensure accurate inventory tracking.
                    </p>
                </div>

                {/* Action Header */}
                <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-slate-800">Bedroom Inventory</h3>
                    <Button variant="primary">
                        <Plus size={16} /> Add Bedroom
                    </Button>
                </div>

                {/* Bedroom List Placeholder */}
                <Card className="p-0 overflow-hidden">
                    <div className="grid grid-cols-[2fr_1fr_3fr_80px] p-4 px-6 bg-slate-50 border-b border-slate-200 font-semibold text-xs uppercase text-slate-500 hidden md:grid">
                        <div className="col-name">Bedroom Label</div>
                        <div className="col-status">Status</div>
                        <div className="col-notes">Notes</div>
                        <div className="col-actions">Actions</div>
                    </div>

                    <div className="flex flex-col">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="grid grid-cols-[1fr_1fr] md:grid-cols-[2fr_1fr_3fr_80px] p-4 px-6 border-b border-slate-100 items-center gap-2">
                                <div className="col-name"><div className="h-4 bg-slate-100 rounded w-32 animate-pulse"></div></div>
                                <div className="col-status"><div className="h-6 bg-slate-100 rounded-full w-20 animate-pulse"></div></div>
                                <div className="col-notes hidden md:block"><div className="h-4 bg-slate-100 rounded w-48 animate-pulse"></div></div>
                                <div className="col-actions hidden md:block"><div className="h-8 bg-slate-200 rounded w-8 animate-pulse"></div></div>
                            </div>
                        ))}
                    </div>

                    {/* Empty State visual hint */}
                    <div className="p-6">
                        <div className="w-full p-4 border-2 border-dashed border-slate-200 rounded-md text-center text-slate-400 font-medium cursor-pointer transition-colors hover:bg-slate-50">
                            + Add another bedroom
                        </div>
                    </div>
                </Card>

            </div>
        </MainLayout>
    );
};
