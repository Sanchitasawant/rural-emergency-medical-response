import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSync } from '../../context/SyncContext';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { AlertCircle, Lock, UserCheck, Eye, EyeOff, WifiOff } from 'lucide-react';

export function Login() {
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const { login, loading } = useAuth();
  const { isOnline } = useSync();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    const res = await login(emailOrUsername, password);

    if (res.success) {
      const role = res.user.role;
      if (role === 'CITIZEN') navigate('/citizen/dashboard');
      else if (role === 'EMERGENCY_WORKER') navigate('/emergency-worker/dashboard');
      else if (role === 'HOSPITAL_STAFF') navigate('/hospital/dashboard');
      else if (role === 'DRIVER_PARAMEDIC') navigate('/driver/dashboard');
      else if (role === 'ADMIN') navigate('/admin/dashboard');
      else navigate('/citizen/dashboard');
    } else {
      setError(res.error);
    }
  };

  const quickFill = (user, pass) => {
    setEmailOrUsername(user);
    setPassword(pass);
  };

  return (
    <div>
      <h3 className="text-xl font-bold text-slate-900 mb-1 text-center">Sign In to RuralCare AI</h3>
      <p className="text-xs text-slate-500 mb-6 text-center">Enter your email address or username to access your dashboard</p>

      {!isOnline && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2 text-xs text-amber-900 font-medium">
          <WifiOff className="w-4 h-4 text-amber-600 shrink-0" />
          <span>Offline Mode: Active internet connection required for new sign-ins.</span>
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-700 font-medium">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-4">
        <Input
          label="Email Address or Username"
          type="text"
          value={emailOrUsername}
          onChange={(e) => setEmailOrUsername(e.target.value)}
          required
          placeholder="e.g. citizen@gmail.com, staff@hospital.org"
        />

        <div className="relative">
          <Input
            label="Password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="••••••••"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-9 text-slate-400 hover:text-slate-600"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        <div className="flex items-center justify-between text-xs">
          <label className="flex items-center gap-2 text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="rounded text-teal-600 focus:ring-teal-500"
            />
            <span>Remember session</span>
          </label>
        </div>

        <Button type="submit" className="w-full" isLoading={loading} icon={Lock}>
          Sign In
        </Button>
      </form>

      <div className="mt-4 text-center">
        <p className="text-xs text-slate-500">
          Need a citizen account?{' '}
          <Link to="/register" className="text-teal-600 font-semibold hover:underline">
            Register as Citizen
          </Link>
        </p>
      </div>

      {/* Quick Test Logins for Seeding */}
      <div className="mt-6 pt-6 border-t border-slate-100">
        <p className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1">
          <UserCheck className="w-3.5 h-3.5 text-teal-600" />
          Test Seed Accounts (Single Click Sign In):
        </p>
        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <button
            onClick={() => quickFill('citizen@gmail.com', 'citizenpassword123')}
            className="p-2 bg-slate-100 hover:bg-slate-200 rounded text-left font-medium text-slate-800"
          >
            Citizen
          </button>
          <button
            onClick={() => quickFill('worker@ruralcare.org', 'workerpassword123')}
            className="p-2 bg-slate-100 hover:bg-slate-200 rounded text-left font-medium text-slate-800"
          >
            Emergency Worker
          </button>
          <button
            onClick={() => quickFill('staff@hospital.org', 'staffpassword123')}
            className="p-2 bg-slate-100 hover:bg-slate-200 rounded text-left font-medium text-slate-800"
          >
            Hospital Staff
          </button>
          <button
            onClick={() => quickFill('driver@ruralcare.org', 'driverpassword123')}
            className="p-2 bg-slate-100 hover:bg-slate-200 rounded text-left font-medium text-slate-800"
          >
            Driver / Paramedic
          </button>
          <button
            onClick={() => quickFill('admin@ruralcare.org', 'adminpassword123')}
            className="col-span-2 p-2 bg-slate-900 hover:bg-slate-800 text-white rounded text-center font-medium"
          >
            System Administrator
          </button>
        </div>
      </div>
    </div>
  );
}
