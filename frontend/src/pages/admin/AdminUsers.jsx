import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService';
import { AdminNav } from './AdminNav';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { FormGroup } from '../../components/common/FormGroup';
import { ConfirmationDialog } from '../../components/common/ConfirmationDialog';
import { Toast } from '../../components/common/Toast';
import {
  Users,
  Search,
  Filter,
  UserPlus,
  Shield,
  CheckCircle,
  XCircle,
  RefreshCw,
  Mail,
  Phone,
  Building2,
  Lock
} from 'lucide-react';

export function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const [toast, setToast] = useState(null);

  // Modal States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showToggleModal, setShowToggleModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [formLoading, setFormLoading] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    role: 'CITIZEN',
    phone_number: '',
    hospital_name: '',
    badge_id: ''
  });

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await adminService.getUsers({
        search,
        role: roleFilter,
        is_active: activeFilter
      });
      setUsers(data);
    } catch (err) {
      showToast('Failed to load user records.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [search, roleFilter, activeFilter]);

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      const res = await adminService.createUser(formData);
      showToast(res.message || 'User account created successfully.', 'success');
      setShowCreateModal(false);
      setFormData({
        email: '',
        password: '',
        first_name: '',
        last_name: '',
        role: 'CITIZEN',
        phone_number: '',
        hospital_name: '',
        badge_id: ''
      });
      fetchUsers();
    } catch (err) {
      showToast(err.response?.data?.detail || 'Failed to create user account.', 'error');
    } finally {
      setFormLoading(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!selectedUser) return;
    setFormLoading(true);
    try {
      const newStatus = !selectedUser.is_active;
      const res = await adminService.toggleUserStatus(selectedUser.uuid, newStatus);
      showToast(res.message || 'User status updated.', 'success');
      setShowToggleModal(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (err) {
      showToast(err.response?.data?.detail || 'Failed to update user status.', 'error');
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            User Account Management
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage user roles, provisions staff accounts, and control system authorization statuses.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={fetchUsers} disabled={loading} icon={RefreshCw} className={loading ? 'animate-spin' : ''}>
            Refresh
          </Button>
          <Button size="md" variant="primary" onClick={() => setShowCreateModal(true)} icon={UserPlus}>
            Create Staff Account
          </Button>
        </div>
      </div>

      <AdminNav />

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search users by name, email, or username..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 bg-slate-50/50"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Role:
            </span>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-200 rounded-xl text-xs bg-slate-50 font-semibold focus:ring-2 focus:ring-teal-500"
            >
              <option value="">All Roles</option>
              <option value="CITIZEN">Citizen</option>
              <option value="EMERGENCY_WORKER">Emergency Worker</option>
              <option value="HOSPITAL_STAFF">Hospital Staff</option>
              <option value="DRIVER_PARAMEDIC">Driver / Paramedic</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-500">Status:</span>
            <select
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-200 rounded-xl text-xs bg-slate-50 font-semibold focus:ring-2 focus:ring-teal-500"
            >
              <option value="">All Statuses</option>
              <option value="true">Active Only</option>
              <option value="false">Deactivated Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <Card title={`System Users Directory (${users.length})`}>
        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400">Loading user directory...</div>
        ) : users.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <Users className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-xs text-slate-500 font-semibold">No users found matching query filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px] bg-slate-50">
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Phone / Hospital</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Registered</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u.uuid} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-extrabold text-slate-900">{u.full_name}</p>
                        <p className="text-[11px] text-slate-500 font-mono">{u.email}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={u.role === 'ADMIN' ? 'critical' : u.role === 'HOSPITAL_STAFF' ? 'info' : 'success'}>
                        {u.role}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      <p>{u.phone_number || 'N/A'}</p>
                      {u.hospital_name && <p className="text-[11px] text-slate-400">{u.hospital_name}</p>}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${u.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                        {u.is_active ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        {u.is_active ? 'Active' : 'Deactivated'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                      {u.created_at ? new Date(u.created_at).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button
                        size="sm"
                        variant={u.is_active ? 'outline' : 'primary'}
                        onClick={() => {
                          setSelectedUser(u);
                          setShowToggleModal(true);
                        }}
                      >
                        {u.is_active ? 'Deactivate' : 'Activate'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* User Creation Modal */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Create Authorized Staff Account">
        <form onSubmit={handleCreateUser} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <FormGroup label="First Name">
              <input
                type="text"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500"
              />
            </FormGroup>
            <FormGroup label="Last Name">
              <input
                type="text"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500"
              />
            </FormGroup>
          </div>

          <FormGroup label="Email Address *">
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500"
            />
          </FormGroup>

          <FormGroup label="Initial Password *">
            <input
              type="password"
              required
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500"
            />
          </FormGroup>

          <FormGroup label="Assigned System Role *">
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 font-bold"
            >
              <option value="CITIZEN">Citizen</option>
              <option value="EMERGENCY_WORKER">Emergency Worker</option>
              <option value="HOSPITAL_STAFF">Hospital Staff / Dispatcher</option>
              <option value="DRIVER_PARAMEDIC">Driver / Paramedic</option>
              <option value="ADMIN">System Administrator</option>
            </select>
          </FormGroup>

          <div className="grid grid-cols-2 gap-3">
            <FormGroup label="Phone Number">
              <input
                type="text"
                value={formData.phone_number}
                onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500"
              />
            </FormGroup>
            <FormGroup label="Hospital Association">
              <input
                type="text"
                placeholder="e.g. Central District Hospital"
                value={formData.hospital_name}
                onChange={(e) => setFormData({ ...formData, hospital_name: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500"
              />
            </FormGroup>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" disabled={formLoading}>
              Create User Account
            </Button>
          </div>
        </form>
      </Modal>

      {/* Confirmation Dialog for Activation Toggle */}
      <ConfirmationDialog
        isOpen={showToggleModal}
        onClose={() => setShowToggleModal(false)}
        onConfirm={handleToggleStatus}
        title={selectedUser?.is_active ? 'Deactivate User Account' : 'Activate User Account'}
        message={`Are you sure you want to ${selectedUser?.is_active ? 'deactivate' : 'activate'} ${selectedUser?.email}? ${selectedUser?.role === 'ADMIN' ? 'Safety checks enforce that at least one admin account remains active.' : ''}`}
        confirmText={selectedUser?.is_active ? 'Deactivate User' : 'Activate User'}
        variant={selectedUser?.is_active ? 'danger' : 'primary'}
      />
    </div>
  );
}
