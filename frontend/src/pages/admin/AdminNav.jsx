import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Building2,
  Truck,
  FileText,
  BarChart3,
  Cpu,
  History,
  Settings
} from 'lucide-react';

export function AdminNav() {
  const navItems = [
    { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/admin/users', label: 'Users', icon: Users },
    { to: '/admin/hospitals', label: 'Hospitals', icon: Building2 },
    { to: '/admin/ambulances', label: 'Ambulances', icon: Truck },
    { to: '/admin/cases', label: 'Cases', icon: FileText },
    { to: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
    { to: '/admin/models', label: 'AI Models', icon: Cpu },
    { to: '/admin/activity', label: 'Activity Logs', icon: History },
    { to: '/admin/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="bg-slate-900 text-white rounded-2xl p-2 mb-6 shadow-md border border-slate-800">
      <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-teal-500 text-white shadow-sm'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </div>
  );
}
