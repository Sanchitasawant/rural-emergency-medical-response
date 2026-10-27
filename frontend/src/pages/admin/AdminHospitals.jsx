import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService';
import { AdminNav } from './AdminNav';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { FormGroup } from '../../components/common/FormGroup';
import { Toast } from '../../components/common/Toast';
import { Building2, Search, Plus, RefreshCw, MapPin, Phone, Edit2 } from 'lucide-react';

export function AdminHospitals() {
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedHospital, setSelectedHospital] = useState(null);
  const [formLoading, setFormLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    district: '',
    address: '',
    contact_number: '',
    icu_beds_available: 0,
    general_beds_available: 0
  });

  const fetchHospitals = async () => {
    setLoading(true);
    try {
      const data = await adminService.getHospitals({ search });
      setHospitals(data);
    } catch (err) {
      showToast('Failed to fetch hospital records.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHospitals();
  }, [search]);

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
  };

  const handleAddHospital = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      const res = await adminService.createHospital(formData);
      showToast(res.message || 'Hospital registered.', 'success');
      setShowAddModal(false);
      setFormData({ name: '', district: '', address: '', contact_number: '', icu_beds_available: 0, general_beds_available: 0 });
      fetchHospitals();
    } catch (err) {
      showToast(err.response?.data?.detail || 'Failed to register hospital.', 'error');
    } finally {
      setFormLoading(false);
    }
  };

  const handleEditHospital = async (e) => {
    e.preventDefault();
    if (!selectedHospital) return;
    setFormLoading(true);
    try {
      const res = await adminService.updateHospital(selectedHospital.uuid, formData);
      showToast(res.message || 'Hospital details updated.', 'success');
      setShowEditModal(false);
      setSelectedHospital(null);
      fetchHospitals();
    } catch (err) {
      showToast(err.response?.data?.detail || 'Failed to update hospital.', 'error');
    } finally {
      setFormLoading(false);
    }
  };

  const openEditModal = (h) => {
    setSelectedHospital(h);
    setFormData({
      name: h.name,
      district: h.district,
      address: h.address,
      contact_number: h.contact_number,
      icu_beds_available: h.icu_beds_available,
      general_beds_available: h.general_beds_available
    });
    setShowEditModal(true);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Hospital Network Management
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Register and manage rural health facilities, capacity records, and emergency contact details.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={fetchHospitals} disabled={loading} icon={RefreshCw} className={loading ? 'animate-spin' : ''}>
            Refresh
          </Button>
          <Button size="md" variant="primary" onClick={() => setShowAddModal(true)} icon={Plus}>
            Register Hospital
          </Button>
        </div>
      </div>

      <AdminNav />

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search hospitals by facility name or district..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 bg-slate-50/50"
          />
        </div>
      </div>

      {/* Hospital Cards Grid */}
      <Card title={`Registered Hospital Facilities (${hospitals.length})`}>
        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400">Loading hospital records...</div>
        ) : hospitals.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <Building2 className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-xs text-slate-500 font-semibold">No hospital records found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {hospitals.map((h) => (
              <div key={h.uuid} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 hover:border-teal-500 transition-colors space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-sm">{h.name}</h3>
                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-teal-600 shrink-0" /> {h.district} District
                    </p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => openEditModal(h)} icon={Edit2}>
                    Edit
                  </Button>
                </div>

                <p className="text-xs text-slate-600 bg-white p-2.5 rounded-xl border border-slate-100">
                  {h.address || 'Address registered'}
                </p>

                <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200/60">
                  <span className="text-slate-500 flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-slate-400" /> {h.contact_number || 'N/A'}
                  </span>
                  <div className="flex items-center gap-2 font-mono text-[11px]">
                    <span className="bg-teal-100 text-teal-800 px-2 py-0.5 rounded-md font-bold">
                      ICU: {h.icu_beds_available}
                    </span>
                    <span className="bg-slate-200 text-slate-800 px-2 py-0.5 rounded-md font-bold">
                      General: {h.general_beds_available}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Hospital Add/Edit Modal */}
      <Modal
        isOpen={showAddModal || showEditModal}
        onClose={() => {
          setShowAddModal(false);
          setShowEditModal(false);
        }}
        title={showEditModal ? 'Edit Hospital Details' : 'Register New Hospital Facility'}
      >
        <form onSubmit={showEditModal ? handleEditHospital : handleAddHospital} className="space-y-4 text-xs">
          <FormGroup label="Hospital Facility Name *">
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500"
            />
          </FormGroup>

          <div className="grid grid-cols-2 gap-3">
            <FormGroup label="District Location *">
              <input
                type="text"
                required
                value={formData.district}
                onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500"
              />
            </FormGroup>
            <FormGroup label="Contact Phone Number">
              <input
                type="text"
                value={formData.contact_number}
                onChange={(e) => setFormData({ ...formData, contact_number: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500"
              />
            </FormGroup>
          </div>

          <FormGroup label="Full Facility Address">
            <textarea
              rows={2}
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500"
            />
          </FormGroup>

          <div className="grid grid-cols-2 gap-3">
            <FormGroup label="Available ICU Beds">
              <input
                type="number"
                min="0"
                value={formData.icu_beds_available}
                onChange={(e) => setFormData({ ...formData, icu_beds_available: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500"
              />
            </FormGroup>
            <FormGroup label="Available General Beds">
              <input
                type="number"
                min="0"
                value={formData.general_beds_available}
                onChange={(e) => setFormData({ ...formData, general_beds_available: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500"
              />
            </FormGroup>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => { setShowAddModal(false); setShowEditModal(false); }}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" disabled={formLoading}>
              {showEditModal ? 'Update Hospital' : 'Register Facility'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
