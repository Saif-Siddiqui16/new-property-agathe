import React from 'react';

export const Table = ({ columns = [], data = [] }) => {
  // 🛡 SAFETY GUARD
  if (!columns.length) {
    return <div className="p-8 text-center text-slate-400 text-sm">No columns defined</div>;
  }

  return (
    <div className="w-full overflow-x-auto bg-white rounded-xl border border-slate-200/60 shadow-card">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="bg-slate-50/50 border-b border-slate-200">
            {columns.map((col) => (
              <th
                key={col.key}
                className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap first:pl-6 last:pr-6"
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-100">
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="p-12 text-center text-slate-400 text-sm">
                <div className="flex flex-col items-center justify-center gap-2">
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                    <span className="text-xl">∅</span>
                  </div>
                  <p>No data available</p>
                </div>
              </td>
            </tr>
          ) : (
            data.map((row, idx) => (
              <tr key={idx} className="hover:bg-slate-50/80 transition-colors duration-200 group">
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className="px-6 py-4 text-sm text-slate-700 align-middle first:pl-6 last:pr-6 group-hover:text-slate-900"
                  >
                    {row[col.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};
