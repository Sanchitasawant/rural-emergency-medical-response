import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  AlertCircle,
  Stethoscope,
  ShieldAlert,
  Truck,
  Users,
  Building2,
  User,
  HelpCircle,
  Activity,
  FileCheck,
  Settings,
  ClipboardList
} from 'lucide-react';

export function Sidebar({ isOpen, onCloseMobile }) {
  const { role } = useAuth();

  const menuByRole = {
    CITIZEN: [
      { label: 'Dashboard', path: '/citizen/dashboard', icon: LayoutDashboard },
      { label: 'Report Emergency', path: '/citizen/report', icon: AlertCircle },
      { label: 'My Reports', path: '/citizen/my-reports', icon: ShieldAlert },
      { label: 'My Profile', path: '/citizen/profile', icon: User },
      { label: 'Help & Safety', path: '/citizen/help', icon: HelpCircle },
    ],
    EMERGENCY_WORKER: [
      { label: 'Dashboard', path: '/emergency-worker/dashboard', icon: LayoutDashboard },
      { label: 'Emergency Cases', path: '/emergency-worker/dashboard', icon: ClipboardList },
      { label: 'New Assessment', path: '/emergency-worker/dashboard', icon: Stethoscope },
      { label: 'AI Assessment', path: '/emergency-worker/dashboard', icon: Activity },
      { label: 'My Profile', path: '/emergency-worker/profile', icon: User },
    ],
    HOSPITAL_STAFF: [
      { label: 'Dashboard', path: '/hospital/dashboard', icon: LayoutDashboard },
      { label: 'Emergency Reports', path: '/hospital/dashboard', icon: FileCheck },
      { label: 'Emergency Cases', path: '/hospital/dashboard', icon: ShieldAlert },
      { label: 'Ambulances', path: '/hospital/dashboard', icon: Truck },
      { label: 'Assignments', path: '/hospital/dashboard', icon: ClipboardList },
      { label: 'My Profile', path: '/hospital/profile', icon: User },
    ],
    DRIVER_PARAMEDIC: [
      { label: 'Dashboard', path: '/driver/dashboard', icon: LayoutDashboard },
      { label: 'My Assignment', path: '/driver/dashboard', icon: Truck },
      { label: 'Active Emergency', path: '/driver/dashboard', icon: AlertCircle },
      { label: 'My Profile', path: '/driver/profile', icon: User },
    ],
    ADMIN: [
      { label: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
      { label: 'User Management', path: '/admin/dashboard', icon: Users },
      { label: 'Hospitals', path: '/admin/dashboard', icon: Building2 },
      { label: 'Ambulances', path: '/admin/dashboard', icon: Truck },
      { label: 'System Activity', path: '/admin/dashboard', icon: Activity },
      { label: 'System Settings', path: '/admin/dashboard', icon: Settings },
      { label: 'My Profile', path: '/admin/profile', icon: User },
    ],
  };

  const menuItems = menuByRole[role] || menuByRole.CITIZEN;

  return (
    <>
      {/* Mobile Drawer Overlay Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-xs lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-slate-900 border-r border-slate-800 text-slate-300 p-4 flex flex-col justify-between shrink-0 transform transition-transform duration-200 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="space-y-6">
          <div className="px-3 pt-2">
            <p className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">Authenticated Role</p>
            <p className="text-xs font-bold text-teal-400 mt-0.5">{role.replace('_', ' ')}</p>
          </div>

          <nav className="space-y-1">
            {menuItems.map((item, idx) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={`${item.path}-${idx}`}
                  to={item.path}
                  onClick={onCloseMobile}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-teal-500/15 text-teal-300 border border-teal-500/30 shadow-xs'
                        : 'hover:bg-slate-800 hover:text-white text-slate-400'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Footer info box */}
        <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl text-xs text-slate-400">
          <p className="font-bold text-slate-200 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-teal-400" /> RuralCare AI Engine
          </p>
          <p className="text-[11px] text-slate-500 mt-1">Clinical Decision Support System</p>
        </div>
      </aside>
    </>
  );
}
