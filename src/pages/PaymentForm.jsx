import React from 'react';
import { MainLayout } from '../layouts/MainLayout';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { DollarSign, Calendar, CreditCard, Info } from 'lucide-react';

export const PaymentForm = () => {
    return (
        <MainLayout title="Record Payment">
            <div className="max-w-4xl mx-auto flex flex-col gap-6">

                {/* Info Banner */}
                <div className="flex items-start gap-4 p-4 rounded-xl bg-blue-50 border border-blue-100 text-blue-900 shadow-sm">
                    <div className="p-2 bg-blue-100 text-blue-600 rounded-lg shrink-0">
                        <Info size={20} />
                    </div>
                    <div className="text-sm leading-relaxed pt-1">
                        <strong>Accounting Rule:</strong> All payments must be linked to a generated invoice for proper ledger tracking. This ensures that your financial reports remain accurate and audit-ready.
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6">
                    {/* Left: Main Details */}
                    <div className="flex flex-col gap-6">
                        <Card title="Payment Details" className="animate-in slide-in-from-bottom-4 duration-500 fade-in">
                            <div className="flex flex-col gap-5">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Linked Invoice</label>
                                    <div className="h-11 px-4 rounded-lg bg-slate-50 border border-slate-200 flex items-center text-slate-500 font-medium text-sm select-none">
                                        INV-2024-001 • Oct Rent
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Payment Amount</label>
                                        <div className="h-11 px-3 rounded-lg border border-slate-200 flex items-center gap-3 bg-white w-full animate-pulse">
                                            <DollarSign size={16} className="text-slate-300" />
                                            <div className="h-4 bg-slate-200 rounded w-24"></div>
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Payment Date</label>
                                        <div className="h-11 px-3 rounded-lg border border-slate-200 flex items-center justify-between bg-white w-full animate-pulse">
                                            <div className="h-4 bg-slate-200 rounded w-28"></div>
                                            <Calendar size={16} className="text-slate-300" />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Payment Method</label>
                                    <div className="h-11 px-3 rounded-lg border border-slate-200 flex items-center justify-between bg-white w-full animate-pulse">
                                        <div className="h-4 bg-slate-200 rounded w-32"></div>
                                        <CreditCard size={16} className="text-slate-300" />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Reference / Notes</label>
                                    <div className="h-24 px-3 py-3 rounded-lg border border-slate-200 bg-white w-full animate-pulse">
                                        <div className="h-4 bg-slate-200 rounded w-full mb-2"></div>
                                        <div className="h-4 bg-slate-200 rounded w-2/3"></div>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    </div>

                    {/* Right: Summary / Actions */}
                    <div className="flex flex-col gap-6">
                        <Card className="animate-in slide-in-from-right-4 duration-500 fade-in delay-100 h-fit sticky top-6">
                            <h4 className="text-xs font-bold uppercase text-slate-400 mb-6 tracking-wider border-b border-slate-100 pb-2">Invoice Balance</h4>

                            <div className="space-y-4">
                                <div className="flex justify-between items-center group">
                                    <span className="text-slate-600 font-medium text-sm group-hover:text-slate-900 transition-colors">Total Due</span>
                                    <div className="h-5 w-20 bg-slate-200 rounded animate-pulse"></div>
                                </div>
                                <div className="flex justify-between items-center group">
                                    <span className="text-slate-600 font-medium text-sm group-hover:text-slate-900 transition-colors">Remaining</span>
                                    <div className="h-5 w-20 bg-slate-200 rounded animate-pulse"></div>
                                </div>

                                <div className="p-4 bg-slate-50 rounded-lg text-xs text-slate-500 leading-relaxed border border-slate-100 my-4">
                                    Partial payments are allowed. The remaining balance will stay open until fully settled.
                                </div>

                                <div className="flex flex-col gap-3 pt-2">
                                    <Button variant="primary" className="w-full justify-center" disabled>Record Transaction</Button>
                                    <Button variant="ghost" className="w-full justify-center">Cancel</Button>
                                </div>
                            </div>
                        </Card>
                    </div>
                </div>

            </div>
        </MainLayout>
    );
};
