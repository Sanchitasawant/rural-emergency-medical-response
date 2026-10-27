import React from 'react';
import { Breadcrumbs } from './Breadcrumbs';

export function PageHeader({ title, description, actions, breadcrumbs = [] }) {
  return (
    <div className="mb-6 pb-4 border-b border-slate-200/80">
      {breadcrumbs.length > 0 && <Breadcrumbs items={breadcrumbs} />}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">{title}</h1>
          {description && <p className="text-sm text-slate-500 mt-1 font-medium">{description}</p>}
        </div>
        {actions && <div className="flex items-center gap-3 shrink-0">{actions}</div>}
      </div>
    </div>
  );
}
