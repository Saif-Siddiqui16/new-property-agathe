import { useState } from 'react';
import { MainLayout } from '../layouts/MainLayout';
import api from '../api/client';

const MonthlyRentReport = () => {
  const [fromMonth, setFromMonth] = useState('');
  const [toMonth, setToMonth] = useState('');

  const handleExport = async (format) => {
    try {
      const response = await api.get(`/api/admin/reports/monthly-rent-collections`, {
        params: {
          startMonth: fromMonth,
          endMonth: toMonth,
          format: format
        },
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      const extension = format === 'excel' ? 'xlsx' : 'csv';
      link.setAttribute('download', `Monthly_Rent_Report.${extension}`);
      
      document.body.appendChild(link);
      link.click();
      
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading report:", error);
      alert("Failed to download report. Check console for details.");
    }
  };

  return (
    <MainLayout title="Monthly Rent & Collections Report">
      <div className="flex flex-col gap-6">
        <div className="bg-white p-6 rounded-xl shadow-[0_10px_25px_rgba(0,0,0,0.06)]">
          <p className="text-sm text-slate-500 mb-6">
            Select a reporting period to export the Monthly Rent & Collections report. 
            The exported file will contain one row per lease per month.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-6 items-end">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">From Month</label>
              <input 
                type="month" 
                className="p-2.5 border border-slate-300 rounded-lg text-sm w-full sm:w-48"
                value={fromMonth}
                onChange={(e) => setFromMonth(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">To Month</label>
              <input 
                type="month" 
                className="p-2.5 border border-slate-300 rounded-lg text-sm w-full sm:w-48"
                value={toMonth}
                onChange={(e) => setToMonth(e.target.value)}
              />
            </div>
            <div className="flex gap-3 mt-4 sm:mt-0">
              <button 
                onClick={() => handleExport('excel')}
                disabled={!fromMonth || !toMonth}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center min-w-[120px]"
              >
                Export Excel
              </button>
              <button 
                onClick={() => handleExport('csv')}
                disabled={!fromMonth || !toMonth}
                className="bg-slate-800 hover:bg-slate-900 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center min-w-[120px]"
              >
                Export CSV
              </button>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default MonthlyRentReport;
