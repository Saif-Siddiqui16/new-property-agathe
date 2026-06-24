import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { User } from 'lucide-react';

export const OwnerSelector = ({ value, onOwnerChange }) => {
    const [owners, setOwners] = useState([]);
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    useEffect(() => {
        // Only Admins can fetch owners. Coworkers do not have access (and don't need it per client req)
        if (user.role !== 'ADMIN') return;

        const fetchOwners = async () => {
            try {
                const res = await api.get('/api/admin/owners');
                setOwners(res.data || []);
            } catch (error) {
                console.error('Failed to fetch owners', error);
            }
        };
        fetchOwners();
    }, [user.role]);

    const handleChange = (e) => {
        onOwnerChange(e.target.value);
    };

    // If the user is a coworker, or if the client wants owners hidden entirely, don't render it at all.
    if (user.role !== 'ADMIN') return null;

    return (
        <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-100 min-w-[240px]">
            <div className="text-indigo-500">
                <User size={18} />
            </div>
            <select
                value={value}
                onChange={handleChange}
                className="bg-transparent border-none outline-none text-slate-700 font-bold text-sm cursor-pointer w-full appearance-none"
            >
                <option value="">All Owners / Global View</option>
                {owners.map(owner => (
                    <option key={owner.id} value={owner.id}>
                        {owner.companyName || owner.name || `Owner #${owner.id}`}
                    </option>
                ))}
            </select>
            <div className="text-slate-400 pointer-events-none text-[10px]">▼</div>
        </div>
    );
};
