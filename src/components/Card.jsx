import React from 'react';
import clsx from 'clsx';

export const Card = ({ children, className, title, action, ...props }) => {
    return (
        <div
            className={clsx(
                'bg-white border border-slate-200/60 rounded-xl shadow-card hover:shadow-lg transition-all duration-300 ease-in-out flex flex-col overflow-hidden',
                className
            )}
            {...props}
        >
            {(title || action) && (
                <div className="py-4 px-6 bg-transparent border-b border-slate-200 flex items-center justify-between">
                    {title && <h3 className="font-sans text-base font-semibold text-slate-900 tracking-[-0.01em]">{title}</h3>}
                    {action && <div className="flex items-center gap-2">{action}</div>}
                </div>
            )}
            <div className="p-6 flex-1 text-slate-500 text-sm">
                {children}
            </div>
        </div>
    );
};
