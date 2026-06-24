import React from 'react';
import { DashboardLayout } from '../layouts/DashboardLayout';

const PlaceholderPage = ({ title }) => (
    <DashboardLayout title={title}>
        <div className="flex flex-col items-center justify-center h-full text-slate-400 py-12">
            <div className="text-4xl mb-4">🚧</div>
            <h2 className="text-xl font-semibold text-slate-600">Module Under Construction</h2>
            <p>The {title} module is coming soon.</p>
        </div>
    </DashboardLayout>
);

export const Leases = () => <PlaceholderPage title="Leases" />;
export const Payments = () => <PlaceholderPage title="Payments" />;
export const Reports = () => <PlaceholderPage title="Reports" />;
export const Settings = () => <PlaceholderPage title="Settings" />;
