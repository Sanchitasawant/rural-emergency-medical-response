import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService';
import { AdminNav } from './AdminNav';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { FormGroup } from '../../components/common/FormGroup';
import { Toast } from '../../components/common/Toast';
import { Truck, Search, Filter, Plus, RefreshCw, Edit2 } from 'lucide-react';

export function AdminAmbulances() {
  const [ambulances, setAmbulances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [toast, setToast] = useState(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedAmbulance, setSelectedAmbulance] = useState(null);
  const [formLoading, setFormLoading] = useState(false);

  const [formData, setFormData] = useState({
    vehicle_number: '',
    vehicle_type: 'BASIC_LIFE_SUPPORT',
    equipment_type: 'Standard EMT Equipment',
    status: 'AVAILABLE'
  });

  const fetchAmbulances = async () => {
    setLoading(true);
    try {
      const data = await adminService.getAmbulances({ status: statusFilter });
      setAmbulances(data);
    } catch (err) {
      showToast('Failed to fetch ambulance records.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAmbulances();
  }, [statusFilter]);

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
  };

  const handleAddAmbulance = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      const res = await adminService.createAmbulance(formData);
      showToast(res.message || 'Ambulance vehicle registered.', 'success');
      setShowAddModal(false);
      setFormData({ vehicle_number: '', vehicle_type: 'BASIC_LIFE_SUPPORT', equipment_type: 'Standard EMT Equipment', status: 'AVAILABLE' });
      fetchAmbulances();
    } catch (err) {
      showToast(err.response?.data?.detail || 'Failed to register ambulance.', 'error');
    } finally {
      setFormLoading(false);
    }
  };

  const handleEditAmbulance = async (e) => {
    e.preventDefault();
    if (!selectedAmbulance) return;
    setFormLoading(true);
    try {
      const res = await adminService.updateAmbulance(selectedAmbulance.uuid, formData);
      showToast(res.message || 'Ambulance vehicle updated.', 'success');
      setShowEditModal(false);
      setSelectedAmbulance(null);
      fetchAmbulances();
    } catch (err) {
      showToast(err.response?.data?.detail || 'Failed to update ambulance.', 'error');
    } finally {
      setFormLoading(false);
    }
  };

  const openEditModal = (a) => {
    setSelectedAmbulance(a);
    setFormData({
      vehicle_number: a.vehicle_number,
      vehicle_type: a.vehicle_type,
      equipment_type: a.equipment_type,
      status: a.status
    });
    setShowEditModal(true);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Ambulance Fleet Oversight
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Register emergency response vehicles, update maintenance flags, and monitor fleet distribution.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={fetchAmbulances} disabled={loading} icon={RefreshCw} className={loading ? 'animate-spin' : ''}>
            Refresh
          </Button>
          <Button size="md" variant="primary" onClick={() => setShowAddModal(true)} icon={Plus}>
            Register Vehicle
          </Button>
        </div>
      </div>

      <AdminNav />

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-bold text-slate-600">Filter by Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs bg-slate-50 font-semibold focus:ring-2 focus:ring-teal-500"
          >
            <option value="">All Statuses</option>
            <option value="AVAILABLE">Available</option>
            <option value="ASSIGNED">Assigned</option>
            <option value="ON_THE_WAY">On the Way</option>
            <option value="ARRIVED">Arrived</option>
            <option value="PATIENT_PICKED_UP">Patient Picked Up</option>
            <option value="BUSY">Busy</option>
            <option value="MAINTENANCE">Maintenance</option>
          </select>
        </div>
      </div>

      {/* Ambulance Table */}
      <Card title={`Ambulance Fleet Directory (${ambulances.length})`}>
        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400">Loading fleet records...</div>
        ) : ambulances.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <Truck className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-xs text-slate-500 font-semibold">No ambulance records found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px] bg-slate-50">
                  <th className="py-3 px-4">Vehicle Number</th>
                  <th className="py-3 px-4">Type & Equipment</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Hospital Facility</th>
                  <th className="py-3 px-4">Assigned Driver</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ambulances.map((a) => (
                  <tr key={a.uuid} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-extrabold text-slate-900 text-sm">
                      {a.vehicle_number}
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-semibold text-slate-800">{a.vehicle_type}</p>
                      <p className="text-[11px] text-slate-500">{a.equipment_type}</p>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={a.status === 'AVAILABLE' ? 'success' : a.status === 'MAINTENANCE' ? 'pending' : 'info'}>
                        {a.status?.replace(/_/g, ' ')}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      {a.hospital_name || 'Central Hospital'}
                    </td>
                    <td className="py-3 px-4 text-slate-700 font-semibold">
                      {a.driver_name || 'Unassigned'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button size="sm" variant="outline" onClick={() => openEditModal(a)} icon={Edit2}>
                        Edit / Status
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Add / Edit Modal */}
      <Modal
        isOpen={showAddModal || showEditModal}
        onClose={() => {
          setShowAddModal(false);
          setShowEditModal(false);
        }}
        title={showEditModal ? 'Edit Vehicle Information & Status' : 'Register New Ambulance Vehicle'}
      >
        <form onSubmit={showEditModal ? handleEditAmbulance : handleAddAmbulance} className="space-y-4 text-xs">
          <FormGroup label="Vehicle Number (License Plate) *">
            <input
              type="text"
              required
              disabled={showEditModal}
              placeholder="e.g. MH-12-AMB-501"
              value={formData.vehicle_number}
              onChange={(e) => setFormData({ ...formData, vehicle_number: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 font-mono font-bold"
            />
          </FormGroup>

          <div className="grid grid-cols-2 gap-3">
            <FormGroup label="Vehicle Type">
              <select
                value={formData.vehicle_type}
                onChange={(e) => setFormData({ ...formData, vehicle_type: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500"
              >
                <option value="BASIC_LIFE_SUPPORT">Basic Life Support (BLS)</option>
                <option value="ADVANCED_LIFE_SUPPORT">Advanced Life Support (ALS)</option>
                <option value="PATIENT_TRANSPORT">Patient Transport Vehicle</option>
              </select>
            </FormGroup>

            <FormGroup label="Fleet Status">
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 font-bold"
              >
                <option value="AVAILABLE">AVAILABLE</option>
                <option value="BUSY">BUSY</option>
                <option value="MAINTENANCE">MAINTENANCE</option>
              </select>
            </FormGroup>
          </div>

          <FormGroup label="Equipment Configuration">
            <input
              type="text"
              value={formData.equipment_type}
              onChange={(e) => setFormData({ ...formData, equipment_type: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500"
            />
          </FormGroup>

          <div className="pt-2 flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => { setShowAddModal(false); setShowEditModal(false); }}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" disabled={formLoading}>
              {showEditModal ? 'Save Changes' : 'Register Vehicle'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
