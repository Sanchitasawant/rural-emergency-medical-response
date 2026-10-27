import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertOctagon, RefreshCw, Home } from 'lucide-react';
import { Button } from '../../components/common/Button';

export function ServerError({ error, resetError }) {
  const navigate = useNavigate();

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="p-4 bg-red-100 border border-red-200 rounded-full text-red-600 mb-4 shadow-xs">
        <AlertOctagon className="w-12 h-12" />
      </div>
      <h2 className="text-3xl font-black text-slate-900 tracking-tight">500 — Application Error</h2>
      <p className="text-sm text-slate-600 max-w-md mt-2 mb-6">
        An unexpected application error occurred. System operations remain protected by local IndexedDB backup.
      </p>

      <div className="flex items-center gap-3">
        {resetError ? (
          <Button variant="danger" onClick={resetError} icon={RefreshCw}>
            Reload Module
          </Button>
        ) : (
          <Button variant="danger" onClick={() => window.location.reload()} icon={RefreshCw}>
            Refresh Application
          </Button>
        )}
        <Button variant="outline" onClick={() => navigate('/')} icon={Home}>
          Return Home
        </Button>
      </div>
    </div>
  );
}
