import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from './Button';

export const PaymentModal = ({ invoice, onClose, onSubmit }) => {
    const [amount, setAmount] = useState(invoice.balance || 0);
    const [paymentMethod, setPaymentMethod] = useState('Bank Transfer');
    const [note, setNote] = useState('');

    const isPartial = parseFloat(amount) < parseFloat(invoice.balance);

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit({ amount, paymentMethod, note });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm transition-opacity">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between p-4 border-b border-slate-200">
                    <h3 className="text-lg font-semibold text-slate-900">Record Payment</h3>
                    <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded text-slate-500 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6">
                    <div className="p-4 bg-slate-50 rounded-md mb-6 border border-slate-200">
                        <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">Invoice For</div>
                        <div className="font-medium text-slate-900 mt-1">{invoice.description}</div>
                        <div className="flex justify-between mt-3 text-sm border-t border-slate-200 pt-3">
                            <span className="text-slate-600">Total Due:</span>
                            <span className="font-bold text-slate-900">${invoice.balance?.toFixed(2)}</span>
                        </div>
                    </div>

                    <div className="flex flex-col gap-5">
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium text-slate-700">Payment Amount ($)</label>
                            <input
                                type="number"
                                step="0.01"
                                className="h-10 w-full border border-slate-300 rounded-md px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                            />
                            {isPartial && (
                                <div className="text-xs text-warning-600 font-medium flex items-center gap-1">
                                    ⚠️ Partial Payment. Remaining balance will stay open.
                                </div>
                            )}
                        </div>

                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium text-slate-700">Payment Method</label>
                            <select
                                className="h-10 w-full border border-slate-300 rounded-md px-3 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
                                value={paymentMethod}
                                onChange={(e) => setPaymentMethod(e.target.value)}
                            >
                                <option>Bank Transfer</option>
                                <option>Check</option>
                                <option>Cash</option>
                                <option>Credit Card</option>
                            </select>
                        </div>

                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium text-slate-700">Notes (Optional)</label>
                            <textarea
                                className="w-full border border-slate-300 rounded-md p-3 text-sm h-24 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all resize-none"
                                placeholder="Reference numbers, dates, etc."
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 mt-8">
                        <Button variant="ghost" onClick={onClose} type="button">Cancel</Button>
                        <Button variant="primary" type="submit">Record Payment</Button>
                    </div>
                </form>
            </div>
        </div>
    );
};
