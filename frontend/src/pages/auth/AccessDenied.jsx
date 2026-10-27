import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ShieldAlert, ArrowLeft, LogOut } from 'lucide-react';
import { Button } from '../../components/common/Button';

export function AccessDenied() {
  const { currentUser, role, logout } = useAuth();
  const navigate = useNavigate();

  const handleReturnToDashboard = () => {
    if (role === 'CITIZEN') navigate('/citizen/dashboard');
    else if (role === 'EMERGENCY_WORKER') navigate('/emergency-worker/dashboard');
    else if (role === 'HOSPITAL_STAFF') navigate('/hospital/dashboard');
    else if (role === 'DRIVER_PARAMEDIC') navigate('/driver/dashboard');
    else if (role === 'ADMIN') navigate('/admin/dashboard');
    else navigate('/login');
  };

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="p-4 bg-red-100 border border-red-200 rounded-full text-red-600 mb-4 shadow-sm">
        <ShieldAlert className="w-12 h-12" />
      </div>
      <h2 className="text-3xl font-black text-slate-900 tracking-tight">403 — Access Denied</h2>
      <p className="text-sm text-slate-600 max-w-md mt-2 mb-6">
        You do not have administrative permission to access this module. Your current role is{' '}
        <span className="font-bold text-teal-700 underline">{role.replace('_', ' ')}</span>.
      </p>

      <div className="flex items-center gap-3">
        <Button variant="primary" onClick={handleReturnToDashboard} icon={ArrowLeft}>
          Return to My Dashboard
        </Button>
        <Button variant="outline" onClick={logout} icon={LogOut}>
          Sign Out
        </Button>
      </div>
    </div>
  );
}
