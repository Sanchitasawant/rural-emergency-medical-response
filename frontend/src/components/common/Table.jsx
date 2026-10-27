import React from 'react';

export function Table({ headers = [], children, emptyMessage = 'No records found.' }) {
  return (
    <div className="w-full overflow-x-auto rounded-lg border border-slate-200 shadow-xs">
      <table className="w-full text-left text-sm border-collapse bg-white">
        <thead className="bg-slate-50 text-slate-700 font-semibold uppercase text-xs tracking-wider border-b border-slate-200">
          <tr>
            {headers.map((header, idx) => (
              <th key={idx} className="px-4 py-3">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 text-slate-800 font-normal">
          {React.Children.count(children) > 0 ? (
            children
          ) : (
            <tr>
              <td colSpan={headers.length || 1} className="px-4 py-8 text-center text-slate-500 italic">
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
