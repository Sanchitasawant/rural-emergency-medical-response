import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { User, Mail, Phone, Shield, Building2, Key } from 'lucide-react';

export function Profile() {
  const { currentUser } = useAuth();

  if (!currentUser) return null;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h2 className="text-2xl font-black text-slate-900">User Account Profile</h2>
        <p className="text-sm text-slate-500">View your identity credentials and assigned role details.</p>
      </div>

      <Card>
        <div className="flex items-center gap-4 pb-6 border-b border-slate-100">
          <div className="w-16 h-16 rounded-2xl bg-teal-600 text-white font-black text-2xl flex items-center justify-center shadow-md">
            {currentUser.first_name ? currentUser.first_name[0].toUpperCase() : currentUser.username[0].toUpperCase()}
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900">
              {currentUser.first_name ? `${currentUser.first_name} ${currentUser.last_name}` : currentUser.username}
            </h3>
            <p className="text-xs text-slate-500 font-mono mt-0.5">{currentUser.email}</p>
            <div className="mt-2">
              <Badge variant="info" size="md">
                Role: {currentUser.role.replace('_', ' ')}
              </Badge>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-6 text-sm">
          <div className="flex items-center gap-3 p-3 bg-slate-50 border rounded-xl">
            <User className="w-5 h-5 text-teal-600" />
            <div>
              <p className="text-xs text-slate-400 font-bold uppercase">Username</p>
              <p className="font-semibold text-slate-800">{currentUser.username}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-slate-50 border rounded-xl">
            <Mail className="w-5 h-5 text-teal-600" />
            <div>
              <p className="text-xs text-slate-400 font-bold uppercase">Email Address</p>
              <p className="font-semibold text-slate-800">{currentUser.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-slate-50 border rounded-xl">
            <Phone className="w-5 h-5 text-teal-600" />
            <div>
              <p className="text-xs text-slate-400 font-bold uppercase">Phone Number</p>
              <p className="font-semibold text-slate-800">{currentUser.phone_number || 'Not provided'}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-slate-50 border rounded-xl">
            <Building2 className="w-5 h-5 text-teal-600" />
            <div>
              <p className="text-xs text-slate-400 font-bold uppercase">Assigned Hospital / Badge</p>
              <p className="font-semibold text-slate-800">
                {currentUser.hospital_name || currentUser.badge_id || 'General System'}
              </p>
            </div>
          </div>

          <div className="col-span-1 sm:col-span-2 flex items-center gap-3 p-3 bg-slate-900 text-white rounded-xl">
            <Key className="w-5 h-5 text-teal-400" />
            <div>
              <p className="text-xs text-slate-400 font-bold uppercase">System Security UUID</p>
              <p className="font-mono text-xs text-teal-300">{currentUser.uuid}</p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
