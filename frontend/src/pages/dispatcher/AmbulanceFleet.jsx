import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSync } from '../../context/SyncContext';
import axios from 'axios';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { ConfirmationDialog } from '../../components/common/ConfirmationDialog';
import { FormGroup } from '../../components/common/FormGroup';
import { calculateHaversineDistance } from '../../utils/geo';
import {
  Truck,
  ShieldAlert,
  Radio,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Search,
  Filter,
  Send,
  MapPin,
  Clock,
  Plus,
  Compass,
  Map
} from 'lucide-react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMapEvents
} from 'react-leaflet';
import L from 'leaflet';

// Fix default Leaflet marker icon paths broken by bundlers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: new URL('leaflet/dist/images/marker-icon-2x.png', import.meta.url).href,
  iconUrl:       new URL('leaflet/dist/images/marker-icon.png',    import.meta.url).href,
  shadowUrl:     new URL('leaflet/dist/images/marker-shadow.png',  import.meta.url).href,
});

// Ambulance marker — distinct teal icon
const ambulanceIcon = new L.Icon({
  iconUrl:      new URL('leaflet/dist/images/marker-icon.png',    import.meta.url).href,
  iconRetinaUrl:new URL('leaflet/dist/images/marker-icon-2x.png', import.meta.url).href,
  shadowUrl:    new URL('leaflet/dist/images/marker-shadow.png',  import.meta.url).href,
  iconSize:    [20, 33],
  iconAnchor:  [10, 33],
  popupAnchor: [1, -28],
  className: 'hue-rotate-120',   // CSS filter gives a green-teal tint
});

// Default map centre — Mumbai, Maharashtra (NOT a real ambulance location)
const DEFAULT_CENTER = [19.076, 72.8777];
const DEFAULT_ZOOM   = 11;

/** Internal helper: fires only when the user clicks the map */
function ClickHandler({ onMapClick }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng);
    }
  });
  return null;
}

export function AmbulanceFleet() {
  const { isOnline } = useSync();
  const [ambulances, setAmbulances] = useState([]);
  const [cases, setCases] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Map: user-selected location (click-to-place marker)
  const [selectedLocation, setSelectedLocation] = useState(null);

  // Dispatch Modal State
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedCaseUuid, setSelectedCaseUuid] = useState('');
  const [selectedAmbulanceUuid, setSelectedAmbulanceUuid] = useState('');
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [dispatchNotes, setDispatchNotes] = useState('');
  const [dispatchLoading, setDispatchLoading] = useState(false);

  const handleMapClick = useCallback((latlng) => {
    setSelectedLocation({ lat: latlng.lat, lng: latlng.lng });
  }, []);

  const fetchFleetData = async () => {
    setLoading(true);
    let ambList = [];
    let caseList = [];
    let drvList = [];

    if (isOnline) {
      try {
        const [ambRes, caseRes, drvRes] = await Promise.all([
          axios.get('/api/hospital/ambulances/'),
          axios.get('/api/hospital/cases/'),
          axios.get('/api/hospital/ambulances/drivers/')
        ]);
        ambList = ambRes.data.results || ambRes.data || [];
        caseList = caseRes.data.results || caseRes.data || [];
        drvList = drvRes.data || [];
      } catch (e) {
        console.log('Online fetch error for fleet management');
      }
    }

    setAmbulances(ambList);
    setCases(caseList.filter(c => c.case_status === 'VERIFIED' || c.case_status === 'ASSESSED'));
    setDrivers(drvList);
    setLoading(false);
  };

  useEffect(() => {
    fetchFleetData();
  }, [isOnline]);

  const filteredAmbulances = ambulances.filter(a => {
    const matchesStatus = filterStatus === 'ALL' || a.status === filterStatus;
    const searchLower = searchQuery.toLowerCase();
    const vehStr = (a.vehicle_number || '').toLowerCase();
    const typeStr = (a.vehicle_type || '').toLowerCase();
    const driverStr = (a.driver_name || '').toLowerCase();
    const matchesSearch = !searchQuery || vehStr.includes(searchLower) || typeStr.includes(searchLower) || driverStr.includes(searchLower);
    return matchesStatus && matchesSearch;
  });

  const availableAmbulances = ambulances.filter(a => a.status === 'AVAILABLE');

  const handleOpenDispatch = (ambulance = null) => {
    if (ambulance) {
      setSelectedAmbulanceUuid(ambulance.uuid);
    } else if (availableAmbulances.length > 0) {
      setSelectedAmbulanceUuid(availableAmbulances[0].uuid);
    }
    if (cases.length > 0) {
      setSelectedCaseUuid(cases[0].uuid);
    }
    if (drivers.length > 0) {
      setSelectedDriverId(String(drivers[0].id));
    }
    setShowDispatchModal(true);
  };

  const handleConfirmDispatch = async () => {
    if (!selectedCaseUuid || !selectedAmbulanceUuid) {
      alert('Please select both an emergency case and an available ambulance.');
      return;
    }

    setDispatchLoading(true);
    try {
      const res = await axios.post('/api/hospital/dispatch/assign/', {
        ambulance_uuid: selectedAmbulanceUuid,
        case_uuid: selectedCaseUuid,
        driver_id: selectedDriverId ? parseInt(selectedDriverId) : null,
        notes: dispatchNotes
      });

      setShowConfirmModal(false);
      setShowDispatchModal(false);
      alert(res.data.message || 'Ambulance dispatched successfully.');
      fetchFleetData();
    } catch (err) {
      console.error(err);
      setShowConfirmModal(false);
      alert(err.response?.data?.detail || 'Failed to dispatch ambulance.');
    } finally {
      setDispatchLoading(false);
    }
  };

  const getStatusBadgeVariant = (st) => {
    switch (st) {
      case 'AVAILABLE': return 'success';
      case 'ASSIGNED': return 'info';
      case 'ON_THE_WAY': return 'warning';
      case 'ARRIVED': return 'primary';
      case 'PATIENT_PICKED_UP': return 'primary';
      case 'BUSY': return 'critical';
      case 'MAINTENANCE': return 'pending';
      default: return 'info';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Ambulance Fleet & Real-Time Tracking
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Monitor vehicle availability, driver assignments, and live response coordinates.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={fetchFleetData}
            disabled={loading}
            icon={RefreshCw}
            className={loading ? 'animate-spin' : ''}
          >
            Refresh
          </Button>
          <Button
            size="md"
            variant="primary"
            onClick={() => handleOpenDispatch()}
            disabled={availableAmbulances.length === 0 || cases.length === 0}
            icon={Send}
          >
            Dispatch Ambulance
          </Button>
        </div>
      </div>

      {/* Interactive Leaflet Map */}
      <Card title="Fleet Geospatial Map">
        <div className="space-y-3">
          {/* Info bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <Map className="w-4 h-4 text-teal-500" />
              <span className="font-semibold text-slate-700">OpenStreetMap tiles (requires internet)</span>
              <span className="italic">— Default centre: Mumbai, Maharashtra (not a live GPS position)</span>
            </div>
            {selectedLocation && (
              <div className="flex items-center gap-1.5 bg-teal-50 border border-teal-200 text-teal-800 px-3 py-1.5 rounded-lg font-mono">
                <MapPin className="w-3.5 h-3.5 shrink-0" />
                Selected: {selectedLocation.lat.toFixed(5)}, {selectedLocation.lng.toFixed(5)}
                <button
                  onClick={() => setSelectedLocation(null)}
                  className="ml-1 text-teal-600 hover:text-teal-900 font-bold"
                  title="Clear selected location"
                >×</button>
              </div>
            )}
          </div>

          {!isOnline && (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 text-xs px-3 py-2 rounded-lg">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>
                <strong>Offline mode:</strong> Map tiles require internet. The map frame and any cached
                tiles will still display, but new tiles cannot be loaded.
                GPS coordinates from API data are shown in the fleet cards below.
              </span>
            </div>
          )}

          {/* Map container */}
          <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-sm" style={{ height: '420px' }}>
            <MapContainer
              center={DEFAULT_CENTER}
              zoom={DEFAULT_ZOOM}
              style={{ height: '100%', width: '100%' }}
              scrollWheelZoom
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {/* Click-to-place marker */}
              <ClickHandler onMapClick={handleMapClick} />
              {selectedLocation && (
                <Marker position={[selectedLocation.lat, selectedLocation.lng]}>
                  <Popup>
                    <strong>Selected location</strong><br />
                    Lat: {selectedLocation.lat.toFixed(5)}<br />
                    Lng: {selectedLocation.lng.toFixed(5)}
                  </Popup>
                </Marker>
              )}

              {/* Ambulance markers — only shown when real GPS data exists */}
              {ambulances
                .filter(a => a.latitude !== null && a.longitude !== null && !isNaN(parseFloat(a.latitude)) && !isNaN(parseFloat(a.longitude)))
                .map(a => (
                  <Marker
                    key={a.uuid}
                    position={[parseFloat(a.latitude), parseFloat(a.longitude)]}
                    icon={ambulanceIcon}
                  >
                    <Popup>
                      <strong>{a.vehicle_number}</strong><br />
                      Status: {a.status?.replace(/_/g, ' ')}<br />
                      Type: {a.vehicle_type}<br />
                      Driver: {a.driver_name || 'Unassigned'}<br />
                      <em className="text-[10px] text-gray-500">Last API-reported GPS position</em>
                    </Popup>
                  </Marker>
                ))
              }
            </MapContainer>
          </div>

          <p className="text-[11px] text-slate-400">
            Click anywhere on the map to place a location marker and read its coordinates.
            Ambulance pins appear only when the backend API reports valid GPS coordinates for a vehicle.
          </p>
        </div>
      </Card>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by vehicle number, type, or driver..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 bg-slate-50/50"
          />
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <span className="text-xs font-bold text-slate-500 flex items-center gap-1 shrink-0">
            <Filter className="w-3.5 h-3.5 text-slate-400" /> Status:
          </span>
          {['ALL', 'AVAILABLE', 'ASSIGNED', 'ON_THE_WAY', 'ARRIVED', 'PATIENT_PICKED_UP', 'BUSY', 'MAINTENANCE'].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-colors ${
                filterStatus === st
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st === 'ALL' ? 'All' : st.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Fleet Table / Cards */}
      <Card title="Ambulance Fleet Status & Active Cases">
        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400 space-y-2">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-teal-600" />
            <p>Loading ambulance fleet information...</p>
          </div>
        ) : filteredAmbulances.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <Truck className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="text-sm font-bold text-slate-700">No ambulance vehicles found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              No vehicles match the selected status filter.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredAmbulances.map((amb) => {
              const isAvail = amb.status === 'AVAILABLE';
              const hasGps = amb.latitude !== null && amb.longitude !== null;

              return (
                <div key={amb.uuid} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/80 p-3 rounded-2xl transition-colors">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold text-slate-900 text-sm font-mono">{amb.vehicle_number}</span>
                      <Badge variant={getStatusBadgeVariant(amb.status)}>
                        {amb.status?.replace(/_/g, ' ')}
                      </Badge>
                      <span className="text-xs text-slate-500 font-semibold">{amb.vehicle_type}</span>
                    </div>

                    <p className="text-xs text-slate-600">
                      Equipment: <span className="font-semibold">{amb.equipment_type}</span> • Hospital: <span className="font-semibold">{amb.hospital_name || 'Central Hospital'}</span>
                    </p>

                    <div className="flex items-center gap-4 text-[11px] text-slate-500 flex-wrap pt-1">
                      <span>Driver: <strong className="text-slate-800">{amb.driver_name || 'Unassigned'}</strong></span>
                      {amb.current_assignment && (
                        <span>Current Case: <strong className="text-teal-700 font-mono">#{amb.current_assignment.substring(0, 8)}</strong></span>
                      )}
                      <span>
                        Last Known Location:{' '}
                        {hasGps ? (
                          <strong className="text-slate-800 font-mono">
                            {float(amb.latitude).toFixed(4)}, {float(amb.longitude).toFixed(4)}
                          </strong>
                        ) : (
                          <span className="italic text-slate-400">GPS signal uncaptured</span>
                        )}
                      </span>
                      <span>Updated: <strong className="text-slate-700">{amb.updated_at ? new Date(amb.updated_at).toLocaleTimeString() : 'Recently'}</strong></span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {isAvail ? (
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => handleOpenDispatch(amb)}
                        disabled={cases.length === 0}
                        icon={Send}
                      >
                        Dispatch Vehicle
                      </Button>
                    ) : (
                      <Badge variant="info">In Operation</Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Dispatch Selection Modal */}
      <Modal
        isOpen={showDispatchModal}
        onClose={() => setShowDispatchModal(false)}
        title="Ambulance Dispatch & Resource Assignment"
      >
        <div className="space-y-4 text-xs">
          {cases.length === 0 ? (
            <div className="p-4 bg-amber-50 text-amber-900 rounded-xl text-xs">
              No verified emergency cases awaiting ambulance dispatch.
            </div>
          ) : availableAmbulances.length === 0 ? (
            <div className="p-4 bg-red-50 text-red-900 rounded-xl text-xs">
              No AVAILABLE ambulances currently in fleet. All vehicles are in operation or maintenance.
            </div>
          ) : (
            <>
              <FormGroup label="1. Select Verified Emergency Case">
                <select
                  value={selectedCaseUuid}
                  onChange={(e) => setSelectedCaseUuid(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500"
                >
                  {cases.map((c) => (
                    <option key={c.uuid} value={c.uuid}>
                      Case {c.uuid.substring(0, 8)} — {c.incident_type?.replace(/_/g, ' ')} (Priority: {c.priority})
                    </option>
                  ))}
                </select>
              </FormGroup>

              <FormGroup label="2. Select Available Ambulance Vehicle">
                <select
                  value={selectedAmbulanceUuid}
                  onChange={(e) => setSelectedAmbulanceUuid(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500 font-mono font-bold"
                >
                  {availableAmbulances.map((a) => (
                    <option key={a.uuid} value={a.uuid}>
                      {a.vehicle_number} — {a.vehicle_type} ({a.equipment_type})
                    </option>
                  ))}
                </select>
              </FormGroup>

              <FormGroup label="3. Select Authorized Driver / Paramedic">
                <select
                  value={selectedDriverId}
                  onChange={(e) => setSelectedDriverId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500"
                >
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.full_name} ({d.email})
                    </option>
                  ))}
                </select>
              </FormGroup>

              <FormGroup label="Dispatch Operational Notes">
                <input
                  type="text"
                  placeholder="e.g. Proceed via Highway 4, priority response"
                  value={dispatchNotes}
                  onChange={(e) => setDispatchNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500"
                />
              </FormGroup>

              <div className="pt-2 flex items-center justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => setShowDispatchModal(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" onClick={() => setShowConfirmModal(true)} icon={Send}>
                  Confirm Dispatch Order
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* Confirmation Dialog for Dispatching */}
      <ConfirmationDialog
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleConfirmDispatch}
        title="Confirm Ambulance Assignment"
        message="Are you sure you want to dispatch this ambulance vehicle? Row locking will be executed to guarantee atomic assignment."
        confirmText="Execute Dispatch"
        variant="primary"
      />
    </div>
  );
}

function float(val) {
  return parseFloat(val) || 0;
}
