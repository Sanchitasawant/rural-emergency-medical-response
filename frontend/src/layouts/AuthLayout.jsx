import React from 'react';
import { Outlet } from 'react-router-dom';
import { HeartPulse } from 'lucide-react';
import { OfflineBanner } from '../components/common/OfflineBanner';

export function AuthLayout() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-between">
      <OfflineBanner />
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 border border-slate-200">
          <div className="flex flex-col items-center mb-6 text-center">
            <div className="p-3 bg-teal-500 rounded-xl text-slate-950 shadow-lg mb-3">
              <HeartPulse className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">RuralCare AI</h2>
            <p className="text-xs text-slate-500 mt-1 font-medium">Offline-First Emergency Response Platform</p>
          </div>
          <Outlet />
        </div>
      </div>
      <footer className="py-4 text-center text-xs text-slate-500 border-t border-slate-900">
        RuralCare AI System © 2026. Production Clinical Decision Support System.
      </footer>
    </div>
  );
}
