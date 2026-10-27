import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { StatusIndicator } from './StatusIndicator';
import { HeartPulse, Bell, LogOut, User, Menu, X, ChevronDown } from 'lucide-react';
import { Link } from 'react-router-dom';

export function TopNavbar({ onToggleMobileSidebar, isMobileSidebarOpen }) {
  const { currentUser, logout, role } = useAuth();
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  return (
    <header className="bg-slate-950 text-white border-b border-slate-800 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand & Mobile Toggle */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleMobileSidebar}
            className="p-2 text-slate-400 hover:text-white lg:hidden rounded-lg hover:bg-slate-900 transition-colors"
            aria-label="Toggle Navigation Menu"
          >
            {isMobileSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <Link to="/" className="flex items-center gap-3 group">
            <div className="p-2 bg-teal-500 rounded-xl text-slate-950 shadow-md group-hover:bg-teal-400 transition-colors">
              <HeartPulse className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight text-white flex items-center gap-2 leading-none">
                RuralCare AI
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-300 font-mono">v1.0</span>
              </h1>
              <p className="text-[11px] text-slate-400 font-medium mt-0.5">AI-Assisted Emergency Response System</p>
            </div>
          </Link>
        </div>

        {/* Right Section: Online Status, Notifications, Profile Menu */}
        <div className="flex items-center gap-3">
          {/* Subtle Online/Offline Status Indicator */}
          <StatusIndicator />

          {/* Notifications Icon */}
          <button
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-900 transition-colors relative"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-teal-400 rounded-full" />
          </button>

          {/* User Menu */}
          {currentUser ? (
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 pl-3 border-l border-slate-800 text-left hover:opacity-90 transition-opacity"
              >
                <div className="w-8 h-8 rounded-full bg-teal-600 text-white font-bold text-xs flex items-center justify-center border border-teal-400">
                  {currentUser.first_name ? currentUser.first_name[0].toUpperCase() : currentUser.username[0].toUpperCase()}
                </div>
                <div className="hidden sm:block">
                  <p className="text-xs font-semibold text-white leading-tight">{currentUser.full_name || currentUser.username}</p>
                  <p className="text-[10px] text-teal-400 font-medium">{role.replace('_', ' ')}</p>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {userMenuOpen && (
                <div
                  className="absolute right-0 mt-2 w-48 bg-white text-slate-900 rounded-xl shadow-2xl border border-slate-200 py-1 z-50 text-xs font-medium animate-in fade-in slide-in-from-top-2"
                  onMouseLeave={() => setUserMenuOpen(false)}
                >
                  <div className="px-3 py-2 border-b border-slate-100 bg-slate-50">
                    <p className="font-bold text-slate-900">{currentUser.full_name || currentUser.username}</p>
                    <p className="text-[10px] text-slate-500 font-mono truncate">{currentUser.email}</p>
                  </div>
                  <Link
                    to={`/${role.toLowerCase().replace('_', '-')}/profile`}
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 hover:bg-slate-100 text-slate-700"
                  >
                    <User className="w-3.5 h-3.5 text-teal-600" />
                    <span>My Account Profile</span>
                  </Link>
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      logout();
                    }}
                    className="w-full text-left flex items-center gap-2 px-3 py-2 hover:bg-red-50 text-red-600 border-t border-slate-100 font-semibold"
                  >
                    <LogOut className="w-3.5 h-3.5 text-red-500" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              to="/login"
              className="px-3 py-1.5 text-xs font-semibold bg-teal-600 hover:bg-teal-500 text-white rounded-lg transition-colors"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
