import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSync } from '../../context/SyncContext';
import { driverService } from '../../services/driverService';
import { calculateHaversineDistance } from '../../utils/geo';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Toast } from '../../components/common/Toast';
import {
  Truck,
  MapPin,
  CheckCircle,
  Navigation,
  Clock,
  AlertTriangle,
  ArrowLeft,
  Building2,
  Users,
  ShieldCheck,
  Compass,
  RefreshCw,
  Phone,
  FileText,
  Wifi,
  WifiOff
} from 'lucide-react';

export function AssignmentDetails() {
  const { uuid } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { isOnline } = useSync();

  const [assignment, setAssignment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState(null);

  // Geolocation State
  const [gpsLocation, setGpsLocation] = useState(null);
  const [gpsError, setGpsError] = useState(null);
  const [gpsWatchId, setGpsWatchId] = useState(null);

  // Fetch Assignment Details
  const loadDetails = async () => {
    setLoading(true);
    try {
      const data = await driverService.getAssignmentDetails(uuid);
      setAssignment(data);
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Failed to load assignment details', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetails();
  }, [uuid]);

  // Handle Geolocation Watcher
  useEffect(() => {
    if ('geolocation' in navigator) {
      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const loc = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            captured_at: new Date(pos.timestamp).toISOString()
          };
          setGpsLocation(loc);
          setGpsError(null);

          // If active response, push periodic updates
          if (assignment && ['ON_THE_WAY', 'ARRIVED', 'PATIENT_PICKED_UP'].includes(assignment.status)) {
            driverService.updateLocation(uuid, loc, isOnline);
          }
        },
        (err) => {
          setGpsError('Location access is unavailable.');
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
      );
      setGpsWatchId(watchId);

      return () => {
        if (watchId) navigator.geolocation.clearWatch(watchId);
      };
    } else {
      setGpsError('Location access is unavailable.');
    }
  }, [uuid, assignment?.status, isOnline]);

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
  };

  // State Machine Transition Handlers
  const handleTransition = async (actionEndpoint, newStatus, successMsg) => {
    setActionLoading(true);
    try {
      const res = await driverService.transitionStatus(
        uuid,
        actionEndpoint,
        newStatus,
        gpsLocation,
        isOnline
      );

      if (res.offline) {
        showToast('Saved Offline — Pending Sync', 'warning');
        // Local state mutation for immediate UI update offline
        setAssignment((prev) => ({
          ...prev,
          status: newStatus,
          is_offline_pending: true
        }));
      } else {
        showToast(successMsg || res.message, 'success');
        setAssignment(res.assignment);
      }
    } catch (err) {
      showToast(err.message || 'Failed to update response status.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="py-16 text-center space-y-3">
        <RefreshCw className="w-8 h-8 animate-spin text-teal-600 mx-auto" />
        <p className="text-xs font-semibold text-slate-600">Loading emergency assignment details...</p>
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="py-12 space-y-4 text-center max-w-md mx-auto">
        <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto" />
        <h2 className="text-lg font-bold text-slate-900">Assignment Not Found</h2>
        <p className="text-xs text-slate-500">
          The requested emergency assignment does not exist or you do not have authorization to view it.
        </p>
        <Link to="/driver/dashboard">
          <Button variant="outline" size="sm" icon={ArrowLeft}>
            Return to Dashboard
          </Button>
        </Link>
      </div>
    );
  }

  const currentStatus = assignment.status;

  // Haversine Straight-line Distance
  const pickupLat = assignment.emergency_case?.latitude;
  const pickupLon = assignment.emergency_case?.longitude;
  const straightLineKm = (gpsLocation && pickupLat && pickupLon)
    ? calculateHaversineDistance(gpsLocation.latitude, gpsLocation.longitude, pickupLat, pickupLon)
    : null;

  // Timeline Steps
  const timelineSteps = [
    { key: 'ASSIGNED', label: 'Assignment Received', timestamp: assignment.created_at },
    { key: 'ACCEPTED', label: 'Accepted', timestamp: assignment.accepted_at },
    { key: 'ON_THE_WAY', label: 'On the Way', timestamp: assignment.started_at },
    { key: 'ARRIVED', label: 'Arrived at Scene', timestamp: assignment.arrived_at },
    { key: 'PATIENT_PICKED_UP', label: 'Patient Picked Up', timestamp: assignment.patient_picked_up_at },
    { key: 'REACHED_HOSPITAL', label: 'Reached Hospital', timestamp: assignment.reached_hospital_at },
    { key: 'COMPLETED', label: 'Response Completed', timestamp: assignment.completed_at }
  ];

  const statusOrder = ['ASSIGNED', 'ACCEPTED', 'ON_THE_WAY', 'ARRIVED', 'PATIENT_PICKED_UP', 'REACHED_HOSPITAL', 'COMPLETED'];
  const currentIndex = statusOrder.indexOf(currentStatus);

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/driver/dashboard')}
            className="p-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-900 tracking-tight">
                Emergency Response Unit
              </h1>
              {assignment.is_offline_pending && (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                  Saved Offline — Pending Sync
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 font-mono">
              Assignment #{assignment.uuid?.substring(0, 8)} • Case #{assignment.emergency_case?.uuid?.substring(0, 8)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isOnline ? (
            <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-xl border border-emerald-200">
              <Wifi className="w-3.5 h-3.5" /> Online
            </span>
          ) : (
            <span className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-800 text-xs font-bold rounded-xl border border-amber-200">
              <WifiOff className="w-3.5 h-3.5" /> Offline Mode
            </span>
          )}
        </div>
      </div>

      {/* Primary Action Button Bar (Mobile-First Large Buttons) */}
      <Card title="Emergency Response Action Controls">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700">Current Phase:</span>
            <Badge variant={currentStatus === 'COMPLETED' ? 'success' : currentStatus === 'CANCELLED' ? 'critical' : 'info'} size="md">
              {currentStatus.replace(/_/g, ' ')}
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {currentStatus === 'ASSIGNED' && (
              <Button
                variant="primary"
                size="lg"
                onClick={() => handleTransition('accept', 'ACCEPTED', 'Assignment accepted.')}
                disabled={actionLoading}
                icon={CheckCircle}
                className="w-full py-4 text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                ACCEPT ASSIGNMENT
              </Button>
            )}

            {currentStatus === 'ACCEPTED' && (
              <Button
                variant="primary"
                size="lg"
                onClick={() => handleTransition('start', 'ON_THE_WAY', 'Response started. En route to scene.')}
                disabled={actionLoading}
                icon={Navigation}
                className="w-full py-4 text-sm font-bold bg-teal-600 hover:bg-teal-700 text-white"
              >
                START RESPONSE
              </Button>
            )}

            {currentStatus === 'ON_THE_WAY' && (
              <Button
                variant="primary"
                size="lg"
                onClick={() => handleTransition('arrive', 'ARRIVED', 'Arrival on scene recorded.')}
                disabled={actionLoading}
                icon={MapPin}
                className="w-full py-4 text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                MARK ARRIVED
              </Button>
            )}

            {currentStatus === 'ARRIVED' && (
              <Button
                variant="primary"
                size="lg"
                onClick={() => handleTransition('pickup', 'PATIENT_PICKED_UP', 'Patient pickup recorded.')}
                disabled={actionLoading}
                icon={Truck}
                className="w-full py-4 text-sm font-bold bg-teal-700 hover:bg-teal-800 text-white"
              >
                PATIENT PICKED UP
              </Button>
            )}

            {currentStatus === 'PATIENT_PICKED_UP' && (
              <Button
                variant="primary"
                size="lg"
                onClick={() => handleTransition('hospital-arrival', 'REACHED_HOSPITAL', 'Hospital arrival recorded.')}
                disabled={actionLoading}
                icon={Building2}
                className="w-full py-4 text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white"
              >
                REACHED HOSPITAL
              </Button>
            )}

            {currentStatus === 'REACHED_HOSPITAL' && (
              <Button
                variant="primary"
                size="lg"
                onClick={() => handleTransition('complete', 'COMPLETED', 'Emergency response completed. Ambulance available.')}
                disabled={actionLoading}
                icon={CheckCircle}
                className="w-full py-4 text-sm font-bold bg-emerald-700 hover:bg-emerald-800 text-white"
              >
                COMPLETE RESPONSE
              </Button>
            )}

            {currentStatus === 'COMPLETED' && (
              <div className="p-4 bg-emerald-50 text-emerald-900 rounded-xl text-xs font-bold flex items-center gap-2 sm:col-span-2">
                <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                Emergency response workflow fully completed. Vehicle status reset to AVAILABLE.
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Incident & Dispatch Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Incident Info */}
        <Card title="Incident Information">
          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-slate-500 font-semibold">Incident Type</span>
              <span className="font-bold text-slate-900 text-sm">
                {assignment.emergency_case?.incident_type?.replace(/_/g, ' ') || 'Emergency Call'}
              </span>
            </div>

            <div className="space-y-1">
              <span className="text-slate-500 font-semibold flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-teal-600" /> Pickup Location
              </span>
              <p className="font-bold text-slate-800 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                {assignment.emergency_case?.location_address || 'Location provided by dispatcher'}
              </p>
            </div>

            <div className="flex items-center justify-between py-1">
              <span className="text-slate-500 font-semibold flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-slate-400" /> Affected Persons
              </span>
              <span className="font-bold text-slate-800">
                {assignment.emergency_case?.affected_count || 1} Person(s)
              </span>
            </div>

            {assignment.notes && (
              <div className="p-3 bg-amber-50/60 text-amber-900 rounded-xl border border-amber-200/50 space-y-1">
                <p className="font-bold text-[11px] flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-amber-700" /> Operational Dispatch Instructions:
                </p>
                <p className="text-xs">{assignment.notes}</p>
              </div>
            )}
          </div>
        </Card>

        {/* Destination & Location Tracking */}
        <Card title="Destination & Live GPS Tracking">
          <div className="space-y-4 text-xs">
            {/* Hospital Destination */}
            <div className="p-3 bg-slate-900 text-white rounded-xl space-y-1">
              <div className="flex items-center justify-between text-slate-400 font-mono text-[11px]">
                <span>DESTINATION HOSPITAL</span>
                <Building2 className="w-4 h-4 text-teal-400" />
              </div>
              <p className="text-sm font-extrabold text-teal-300">
                {assignment.ambulance?.hospital_name || 'Central District Emergency Hospital'}
              </p>
              <p className="text-[11px] text-slate-300">
                Authorized Emergency Receiving Facility
              </p>
            </div>

            {/* GPS & Distance Calculation */}
            <div className="space-y-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 flex items-center gap-1">
                  <Compass className="w-4 h-4 text-teal-600" /> Device Geolocation Status
                </span>
                {gpsLocation ? (
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                    GPS Active (±{Math.round(gpsLocation.accuracy || 0)}m)
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-slate-500 bg-slate-200 px-2 py-0.5 rounded-full">
                    Acquiring Signal...
                  </span>
                )}
              </div>

              {gpsError ? (
                <p className="text-xs text-amber-700 font-semibold">{gpsError}</p>
              ) : gpsLocation ? (
                <div className="text-[11px] font-mono text-slate-600 space-y-0.5">
                  <p>Lat: {gpsLocation.latitude.toFixed(6)}, Lon: {gpsLocation.longitude.toFixed(6)}</p>
                </div>
              ) : (
                <p className="text-slate-400 text-xs italic">Requesting browser geolocation permission...</p>
              )}

              {/* Haversine & ETA */}
              <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-slate-700 font-semibold">
                <span>Straight-line Distance:</span>
                <span className="font-bold font-mono text-slate-900">
                  {straightLineKm !== null ? `${straightLineKm} km` : 'Unavailable'}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-500 text-[11px]">
                <span>Estimated Travel Time:</span>
                <span className="font-medium text-slate-600 italic">Driving ETA unavailable</span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Response Status Timeline */}
      <Card title="Emergency Response Status Timeline">
        <div className="py-2">
          <div className="relative border-l-2 border-slate-200 ml-4 space-y-6">
            {timelineSteps.map((step, idx) => {
              const isCompleted = currentIndex >= idx;
              const isCurrent = currentIndex === idx;

              return (
                <div key={step.key} className="relative pl-6">
                  {/* Timeline Node Dot */}
                  <span
                    className={`absolute -left-[9px] top-0.5 w-4 h-4 rounded-full border-2 transition-colors ${
                      isCurrent
                        ? 'bg-teal-500 border-white ring-4 ring-teal-100'
                        : isCompleted
                        ? 'bg-emerald-600 border-white'
                        : 'bg-slate-200 border-white'
                    }`}
                  />

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <div>
                      <p className={`text-xs font-extrabold ${isCurrent ? 'text-teal-900 text-sm' : isCompleted ? 'text-slate-900' : 'text-slate-400'}`}>
                        {step.label}
                      </p>
                      {step.timestamp && (
                        <p className="text-[11px] font-mono text-slate-400 flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3" /> {new Date(step.timestamp).toLocaleString()}
                        </p>
                      )}
                    </div>
                    {isCurrent && (
                      <span className="inline-block px-2 py-0.5 text-[10px] font-extrabold uppercase bg-teal-100 text-teal-800 rounded-md shrink-0">
                        In Progress
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Vehicle Info Card */}
      <Card title="Assigned Vehicle Details">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-slate-400 font-semibold block">Vehicle Number</span>
            <span className="font-black text-slate-900 font-mono text-sm">
              {assignment.ambulance?.vehicle_number || 'N/A'}
            </span>
          </div>
          <div>
            <span className="text-slate-400 font-semibold block">Vehicle Type</span>
            <span className="font-bold text-slate-800">
              {assignment.ambulance?.vehicle_type || 'BASIC_LIFE_SUPPORT'}
            </span>
          </div>
          <div>
            <span className="text-slate-400 font-semibold block">Equipment</span>
            <span className="font-bold text-slate-800">
              {assignment.ambulance?.equipment_type || 'Standard Care'}
            </span>
          </div>
          <div>
            <span className="text-slate-400 font-semibold block">Driver Assigned</span>
            <span className="font-bold text-slate-800">
              {assignment.driver_paramedic?.full_name || currentUser?.full_name || 'Assigned Driver'}
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
}
