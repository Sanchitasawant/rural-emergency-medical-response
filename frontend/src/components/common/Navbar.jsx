import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSync } from '../../context/SyncContext';
import { HeartPulse, User, LogOut, Wifi, WifiOff } from 'lucide-react';
import { Badge } from './Badge';

export function Navbar() {
  const { user, logout } = useAuth();
  const { isOnline, pendingCount } = useSync();

  return (
    <header className="bg-slate-950 text-white border-b border-slate-800 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="p-2 bg-teal-500 rounded-lg text-slate-950 shadow-md">
            <HeartPulse className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
              RuralCare AI
              <span className="text-xs px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 font-mono">v1.0</span>
            </h1>
            <p className="text-[11px] text-slate-400 font-medium">AI-Assisted Emergency Response System</p>
          </div>
        </div>

        {/* Status & User */}
        <div className="flex items-center gap-4">
          {/* Network Indicator */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-slate-900 border border-slate-800 rounded-full text-xs">
            {isOnline ? (
              <>
                <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-slate-300 font-medium">Online</span>
                {pendingCount > 0 && (
                  <Badge variant="pending" size="xs">
                    {pendingCount} Sync Pending
                  </Badge>
                )}
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                <span className="text-amber-300 font-medium">Offline Mode</span>
              </>
            )}
          </div>

          {/* User Info */}
          {user ? (
            <div className="flex items-center gap-3 pl-3 border-l border-slate-800">
              <div className="text-right hidden md:block">
                <p className="text-sm font-semibold text-white leading-tight">
                  {user.first_name ? `${user.first_name} ${user.last_name}` : user.username}
                </p>
                <p className="text-[11px] text-teal-400 font-medium tracking-wide">
                  {user.role.replace('_', ' ')}
                </p>
              </div>
              <button
                onClick={logout}
                title="Logout"
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <a
              href="/login"
              className="px-4 py-2 text-xs font-semibold bg-teal-600 hover:bg-teal-500 text-white rounded-lg transition-colors"
            >
              Sign In
            </a>
          )}
        </div>
      </div>
    </header>
  );
}
