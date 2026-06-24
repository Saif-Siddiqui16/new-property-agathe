import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, ArrowRight } from 'lucide-react';

export const SelectProperty = () => {
  const navigate = useNavigate();

  const handleSelectProperty = (propertyId) => {
    localStorage.setItem('selectedProperty', propertyId);
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 relative overflow-hidden">
      {/* Decorative background glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-4xl z-10">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-extrabold tracking-tight text-white mb-3">
            Select Property Environment
          </h1>
          <p className="text-slate-400 text-lg max-w-md mx-auto">
            Choose the property portfolio you would like to manage.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Masteko Property Card */}
          <div 
            onClick={() => handleSelectProperty('masteko')}
            className="group cursor-pointer bg-slate-800/40 border border-slate-700/50 hover:border-blue-500/50 rounded-3xl p-8 backdrop-blur-md transition-all duration-300 transform hover:-translate-y-2 hover:shadow-2xl hover:shadow-blue-500/5"
          >
            <div className="w-16 h-16 rounded-2xl bg-blue-600/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Building2 size={32} />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2 group-hover:text-blue-400 transition-colors">
              Mont-Tremblant
            </h2>
            <p className="text-slate-400 mb-6 leading-relaxed">
              Manage the Mont-Tremblant property environment, tenants, leases, and shuttle services.
            </p>
            <div className="flex items-center text-blue-400 font-bold text-sm">
              Enter Dashboard
              <ArrowRight size={16} className="ml-2 group-hover:translate-x-1.5 transition-transform" />
            </div>
          </div>

          {/* St-Agathe Property Card */}
          <div 
            onClick={() => handleSelectProperty('stagathe')}
            className="group cursor-pointer bg-slate-800/40 border border-slate-700/50 hover:border-indigo-500/50 rounded-3xl p-8 backdrop-blur-md transition-all duration-300 transform hover:-translate-y-2 hover:shadow-2xl hover:shadow-indigo-500/5"
          >
            <div className="w-16 h-16 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Building2 size={32} />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2 group-hover:text-indigo-400 transition-colors">
              St-Agathe
            </h2>
            <p className="text-slate-400 mb-6 leading-relaxed">
              Manage the St-Agathe property environment, tenants, leases, and localized configurations.
            </p>
            <div className="flex items-center text-indigo-400 font-bold text-sm">
              Enter Dashboard
              <ArrowRight size={16} className="ml-2 group-hover:translate-x-1.5 transition-transform" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
