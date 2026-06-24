import React, { useState } from 'react';
import { TenantLayout } from '../../layouts/TenantLayout';
import { CreditCard, Wallet, Banknote, CheckCircle, ArrowRight, ShieldCheck, X } from 'lucide-react';
import { Button } from '../../components/Button';

import api from '../../api/client';

export const TenantPayments = () => {
    const [selectedMethod, setSelectedMethod] = useState('card');
    const [isProcessing, setIsProcessing] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    const [unpaidInvoices, setUnpaidInvoices] = useState([]);
    const [selectedInvoice, setSelectedInvoice] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    React.useEffect(() => {
        const fetchInvoices = async () => {
            try {
                const res = await api.get('/api/tenant/invoices');
                const unpaid = res.data.filter(inv =>
                    inv.status === 'Due' ||
                    inv.status === 'Overdue' ||
                    inv.status === 'Partial'
                );
                setUnpaidInvoices(unpaid);
                if (unpaid.length > 0) setSelectedInvoice(unpaid[0]);
            } catch (e) {
                console.error(e);
            } finally {
                setIsLoading(false);
            }
        };
        fetchInvoices();
    }, []);

    const handlePayment = async (e) => {
        e.preventDefault();
        if (!selectedInvoice) return;

        setIsProcessing(true);
        try {
            await api.post('/api/tenant/pay', {
                invoiceId: selectedInvoice.dbId,
                amount: selectedInvoice.balanceDue || selectedInvoice.amount,
                paymentMethod: selectedMethod
            });

            setIsProcessing(false);
            setShowSuccess(true);
        } catch (error) {
            console.error(error);
            setIsProcessing(false);
            alert('Payment failed. Please try again.');
        }
    };

    if (isLoading) return <div className="p-10 text-center">Loading payment details...</div>;

    if (unpaidInvoices.length === 0 && !showSuccess) {
        return (
            <TenantLayout title="Pay Rent">
                <div className="p-10 text-center bg-white rounded-3xl border border-slate-100 shadow-sm">
                    <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle size={40} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800">No Pending Dues</h3>
                    <p className="text-slate-500 mt-2">You are all caught up! No rent is due at this time.</p>
                </div>
            </TenantLayout>
        );
    }

    return (
        <TenantLayout title="Pay Rent">
            <div className="max-w-6xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* LEFT: SELECTION & METHODS */}
                    <div className="lg:col-span-8 space-y-6">
                        {/* INVOICE SELECTION */}
                        <section className="bg-white rounded-3xl border border-slate-100 p-8 shadow-sm space-y-6">
                            <div className="space-y-1">
                                <h3 className="text-xl font-black text-slate-800 tracking-tight">Select Invoice</h3>
                                <p className="text-sm text-slate-500 font-medium">Choose which outstanding payment you want to settle now.</p>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {unpaidInvoices.map((inv) => (
                                    <button
                                        key={inv.id}
                                        onClick={() => setSelectedInvoice(inv)}
                                        className={`flex flex-col p-5 rounded-2xl border-2 transition-all text-left relative ${selectedInvoice?.id === inv.id
                                            ? 'border-indigo-600 bg-indigo-50/30'
                                            : 'border-slate-100 hover:border-slate-200 bg-white'
                                            }`}
                                    >
                                        <div className="flex justify-between items-start w-full mb-3">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{inv.id}</span>
                                            <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${inv.status === 'Overdue' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}`}>
                                                {inv.status}
                                            </span>
                                        </div>
                                        <h4 className="font-bold text-slate-800">{inv.month}</h4>
                                        <div className="mt-auto pt-4 flex items-end justify-between">
                                            <span className="text-lg font-black text-slate-900">${(inv.balanceDue || inv.amount).toLocaleString('en-CA', { minimumFractionDigits: 2 })}</span>
                                            {selectedInvoice?.id === inv.id && (
                                                <div className="bg-indigo-600 text-white rounded-full p-1 shadow-md">
                                                    <CheckCircle size={14} />
                                                </div>
                                            )}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </section>

                        <section className="bg-white rounded-3xl border border-slate-100 p-8 shadow-sm space-y-8">
                            <div className="space-y-2">
                                <h3 className="text-xl font-black text-slate-800 tracking-tight">Payment Method</h3>
                                <p className="text-sm text-slate-500 font-medium">Select how you would like to pay.</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {[
                                    { id: 'card', label: 'Card', icon: CreditCard },
                                    { id: 'bank', label: 'Bank', icon: Banknote },
                                    { id: 'wallet', label: 'Wallet', icon: Wallet },
                                ].map((method) => (
                                    <button
                                        key={method.id}
                                        onClick={() => setSelectedMethod(method.id)}
                                        className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all text-left ${selectedMethod === method.id
                                            ? 'border-primary-600 bg-primary-50/30'
                                            : 'border-slate-100 hover:border-primary-200'
                                            }`}
                                    >
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${selectedMethod === method.id ? 'bg-primary-600 text-white' : 'bg-slate-50 text-slate-400'
                                            }`}>
                                            <method.icon size={20} />
                                        </div>
                                        <h4 className={`font-bold text-sm ${selectedMethod === method.id ? 'text-primary-700' : 'text-slate-700'}`}>
                                            {method.label}
                                        </h4>
                                    </button>
                                ))}
                            </div>

                            <div className="pt-2">
                                <Button
                                    className="w-full h-14 rounded-2xl font-black text-lg shadow-xl shadow-primary-100 flex items-center justify-center gap-2"
                                    onClick={handlePayment}
                                    disabled={isProcessing || !selectedInvoice}
                                >
                                    {isProcessing ? (
                                        <>
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                            Processing...
                                        </>
                                    ) : (
                                        <>
                                            Pay ${(selectedInvoice?.balanceDue || selectedInvoice?.amount)?.toLocaleString('en-CA', { minimumFractionDigits: 2 })}
                                            <ArrowRight size={20} />
                                        </>
                                    )}
                                </Button>
                                <div className="mt-4 flex items-center justify-center gap-2 text-slate-400">
                                    <ShieldCheck size={16} />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Secure 256-bit Encrypted Payment</span>
                                </div>
                            </div>
                        </section>
                    </div>

                    {/* RIGHT: SUMMARY */}
                    <div className="lg:col-span-4 space-y-6">
                        <section className="bg-slate-900 rounded-3xl p-8 text-white shadow-xl shadow-slate-200/50 space-y-8 sticky top-24">
                            <h3 className="text-lg font-bold">Payment Summary</h3>

                            <div className="space-y-4">
                                <div className="flex justify-between items-center text-slate-400 font-medium text-sm">
                                    <span>{selectedInvoice?.status === 'Partial' ? 'Remaining Balance' : 'Rent'} ({selectedInvoice?.month || '---'})</span>
                                    <span className="text-white font-bold tracking-tight">${(selectedInvoice?.balanceDue || selectedInvoice?.amount || 0).toLocaleString('en-CA', { minimumFractionDigits: 2 })}</span>
                                </div>
                                <div className="flex justify-between items-center text-slate-400 font-medium text-sm">
                                    <span>Processing Fee</span>
                                    <span className="text-emerald-400 font-bold tracking-tight">$0.00</span>
                                </div>
                            </div>

                            <div className="pt-8 border-t border-slate-800 space-y-1">
                                <p className="text-xs text-slate-500 font-black uppercase tracking-widest">{selectedInvoice?.status === 'Partial' ? 'Balance to Pay' : 'Total to Pay'}</p>
                                <div className="flex justify-between items-end">
                                    <span className="text-4xl font-black tracking-tighter">${(selectedInvoice?.balanceDue || selectedInvoice?.amount || 0).toLocaleString('en-CA', { minimumFractionDigits: 2 })}</span>
                                    <span className="text-xs font-bold text-slate-500 mb-2 underline decoration-slate-700 underline-offset-4">USD</span>
                                </div>
                            </div>

                            <div className="bg-slate-800/50 rounded-2xl p-4 flex gap-4 border border-white/5">
                                <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center shrink-0">
                                    <CheckCircle size={20} className="text-emerald-500" />
                                </div>
                                <p className="text-xs text-slate-400 font-medium leading-relaxed">
                                    {selectedInvoice ? `Your payment for ${selectedInvoice.month} will be processed immediately.` : 'Select an invoice to proceed with payment.'}
                                </p>
                            </div>
                        </section>
                    </div>
                </div>
            </div>

            {/* SUCCESS MODAL */}
            {showSuccess && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-500 text-center p-10 space-y-6">
                        <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-2 animate-bounce duration-1000">
                            <CheckCircle size={48} />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-2xl font-black text-slate-800">Payment Successful!</h3>
                            <p className="text-slate-500 font-medium">Your payment for {selectedInvoice?.month} has been successfully recorded.</p>
                        </div>
                        <div className="bg-slate-50 rounded-2xl p-4 text-left border border-slate-100">
                            <div className="flex justify-between text-xs font-bold py-1">
                                <span className="text-slate-400 uppercase">Receipt #</span>
                                <span className="text-slate-700">RCP-{Math.floor(Math.random() * 100000)}</span>
                            </div>
                            <div className="flex justify-between text-xs font-bold py-1">
                                <span className="text-slate-400 uppercase">Method</span>
                                <span className="text-slate-700 uppercase">{selectedMethod}</span>
                            </div>
                        </div>
                        <Button variant="primary" className="w-full rounded-2xl h-12 h-auto font-bold mt-2" onClick={() => window.location.reload()}>
                            Great, thanks!
                        </Button>
                    </div>
                </div>
            )}
        </TenantLayout>
    );
};
