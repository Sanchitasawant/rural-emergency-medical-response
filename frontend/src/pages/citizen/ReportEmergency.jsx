import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSync } from '../../context/SyncContext';
import { db } from '../../offline/db';
import { unifiedSyncService } from '../../services/sync/unifiedSyncService';
import { generateUUID } from '../../utils/uuid';
import axios from 'axios';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Textarea } from '../../components/common/Textarea';
import { Badge } from '../../components/common/Badge';
import {
  ShieldAlert,
  MapPin,
  Camera,
  X,
  Send,
  CheckCircle2,
  AlertCircle,
  WifiOff,
  Navigation,
  FileText
} from 'lucide-react';

const INCIDENT_OPTIONS = [
  { label: 'Road Accident / Vehicle Crash', value: 'ROAD_ACCIDENT' },
  { label: 'Medical Emergency / Acute Illness', value: 'MEDICAL_EMERGENCY' },
  { label: 'Fire Emergency', value: 'FIRE' },
  { label: 'Severe Physical Injury', value: 'INJURY' },
  { label: 'Unconscious / Unresponsive Person', value: 'UNCONSCIOUS_PERSON' },
  { label: 'Multiple Casualties / Mass Incident', value: 'MULTIPLE_CASUALTIES' },
  { label: 'Other Emergency', value: 'OTHER' },
];

export function ReportEmergency() {
  const { currentUser } = useAuth();
  const { isOnline, refreshPendingCount } = useSync();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    incident_type: 'ROAD_ACCIDENT',
    other_incident_description: '',
    affected_people_count: 1,
    description: '',
    latitude: '',
    longitude: '',
    location_accuracy: '',
    location_captured_at: ''
  });

  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [geoStatus, setGeoStatus] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedReport, setSubmittedReport] = useState(null);

  const MAX_DESC_CHARS = 1000;

  // Browser Geolocation API Handler
  const handleUseMyLocation = () => {
    setGeoStatus('Locating device position...');
    setFieldErrors(prev => ({ ...prev, location: null }));

    if (!navigator.geolocation) {
      setGeoStatus('Geolocation is not supported by your browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Math.round(pos.coords.latitude * 1000000) / 1000000;
        const lng = Math.round(pos.coords.longitude * 1000000) / 1000000;
        const acc = Math.round(pos.coords.accuracy * 10) / 10;
        const timestamp = new Date().toISOString();

        setFormData(prev => ({
          ...prev,
          latitude: lat,
          longitude: lng,
          location_accuracy: acc,
          location_captured_at: timestamp
        }));
        setGeoStatus(`Location captured (Accuracy: ±${acc}m)`);
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setGeoStatus('Geolocation permission denied. Please enter coordinates or landmark manually below.');
        } else {
          setGeoStatus('Unable to retrieve device position. Please enter landmark manually.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Image Upload & Validation Handler
  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setFieldErrors(prev => ({ ...prev, photo: 'Image size exceeds the allowed limit of 5MB.' }));
      return;
    }

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setFieldErrors(prev => ({ ...prev, photo: 'Unsupported file type. Please upload JPG, PNG, or WEBP.' }));
      return;
    }

    setFieldErrors(prev => ({ ...prev, photo: null }));
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setPhotoPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
  };

  // Client-Side Validation
  const validateForm = () => {
    const errs = {};
    if (!formData.incident_type) errs.incident_type = 'Please select an incident type.';

    if (formData.incident_type === 'OTHER' && !formData.other_incident_description.trim()) {
      errs.other_incident_description = "Please describe the incident when 'Other' is selected.";
    }

    const count = parseInt(formData.affected_people_count, 10);
    if (isNaN(count) || count < 1) {
      errs.affected_people_count = 'Number of affected people must be an integer of at least 1.';
    }

    if (!formData.description.trim()) {
      errs.description = 'Please describe what you observed.';
    } else if (formData.description.trim().length < 5) {
      errs.description = 'Please provide a detailed description (at least 5 characters).';
    }

    const lat = parseFloat(formData.latitude);
    const lng = parseFloat(formData.longitude);

    if (formData.latitude !== '' && (isNaN(lat) || lat < -90 || lat > 90)) {
      errs.latitude = 'Latitude must be a valid number between -90 and +90 degrees.';
    }
    if (formData.longitude !== '' && (isNaN(lng) || lng < -180 || lng > 180)) {
      errs.longitude = 'Longitude must be a valid number between -180 and +180 degrees.';
    }

    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    const errs = validateForm();
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      return;
    }

    setIsSubmitting(true);
    const clientUuid = generateUUID();
    const createdTimestamp = new Date().toISOString();

    const reportPayload = {
      client_uuid: clientUuid,
      incident_type: formData.incident_type,
      other_incident_description: formData.incident_type === 'OTHER' ? formData.other_incident_description : '',
      affected_people_count: parseInt(formData.affected_people_count, 10) || 1,
      description: formData.description.trim(),
      latitude: formData.latitude !== '' ? parseFloat(formData.latitude) : null,
      longitude: formData.longitude !== '' ? parseFloat(formData.longitude) : null,
      location_accuracy: formData.location_accuracy !== '' ? parseFloat(formData.location_accuracy) : null,
      location_captured_at: formData.location_captured_at || createdTimestamp,
      status: 'UNVERIFIED',
      priority: 'PENDING',
      created_at: createdTimestamp
    };

    if (isOnline) {
      try {
        const postData = new FormData();
        Object.keys(reportPayload).forEach(key => {
          if (reportPayload[key] !== null && reportPayload[key] !== undefined) {
            postData.append(key, reportPayload[key]);
          }
        });
        if (photoFile) {
          postData.append('photo', photoFile);
        }

        const res = await axios.post('/api/emergency/reports/', postData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });

        // Store local copy as SYNCED
        await db.emergency_reports.add({
          ...reportPayload,
          uuid: res.data.uuid,
          sync_status: 'SYNCED',
          client_timestamp: createdTimestamp
        });

        setSubmittedReport({ ...res.data, sync_status: 'SYNCED' });
        setIsSubmitting(false);
        return;
      } catch (err) {
        console.warn('Online API submission failed, falling back to IndexedDB:', err);
      }
    }

    // OFFLINE OR BACKEND FALLBACK: Save locally in IndexedDB & Enqueue in unifiedSyncService
    const localRecord = {
      ...reportPayload,
      photo_preview: photoPreview,
      sync_status: 'PENDING_SYNC',
      client_timestamp: createdTimestamp,
      retry_count: 0
    };

    await db.emergency_reports.add(localRecord);
    await unifiedSyncService.enqueueRecord(
      'EMERGENCY_REPORT',
      'CREATE',
      reportPayload,
      'NORMAL',
      []
    );
    await refreshPendingCount();

    setSubmittedReport({
      ...localRecord,
      uuid: clientUuid,
      isOfflineSaved: true
    });
    setIsSubmitting(false);
  };

  // SUCCESS CONFIRMATION SCREEN
  if (submittedReport) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Card className="text-center p-8 border-emerald-200">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Emergency Report Submitted</h2>
          <p className="text-sm text-slate-500 mt-1">
            Your emergency report has been recorded under status <strong className="text-amber-600">UNVERIFIED</strong>.
          </p>

          <div className="my-6 p-4 bg-slate-50 border rounded-2xl text-xs space-y-2 text-left">
            <div className="flex justify-between">
              <span className="text-slate-500">Report Case ID / UUID:</span>
              <span className="font-mono font-bold text-slate-900">{submittedReport.uuid || submittedReport.client_uuid}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Verification Status:</span>
              <Badge variant="pending">UNVERIFIED</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Sync Status:</span>
              <Badge variant={submittedReport.sync_status === 'SYNCED' ? 'synced' : 'pending'}>
                {submittedReport.sync_status === 'SYNCED' ? 'Synced to Server' : 'Saved Locally (Pending Sync)'}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Submission Timestamp:</span>
              <span className="font-medium text-slate-800">{new Date(submittedReport.created_at || submittedReport.client_timestamp).toLocaleString()}</span>
            </div>
            {(submittedReport.latitude || submittedReport.longitude) && (
              <div className="flex justify-between">
                <span className="text-slate-500">Captured Location:</span>
                <span className="font-medium text-slate-800">{submittedReport.latitude}, {submittedReport.longitude}</span>
              </div>
            )}
          </div>

          {submittedReport.isOfflineSaved && (
            <div className="mb-6 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center gap-2">
              <WifiOff className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Saved locally in IndexedDB. It will synchronize automatically when connection is restored.</span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/citizen/reports">
              <Button variant="primary" icon={FileText}>
                View My Reports
              </Button>
            </Link>
            <Button
              variant="outline"
              onClick={() => {
                setSubmittedReport(null);
                setFormData({
                  incident_type: 'ROAD_ACCIDENT',
                  other_incident_description: '',
                  affected_people_count: 1,
                  description: '',
                  latitude: '',
                  longitude: '',
                  location_accuracy: '',
                  location_captured_at: ''
                });
                setPhotoFile(null);
                setPhotoPreview(null);
              }}
            >
              Report Another Incident
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
          <ShieldAlert className="w-6 h-6 text-red-600" />
          Report Emergency Incident
        </h2>
        <p className="text-sm text-slate-500">Fill in the observed details below. Works offline without internet connectivity.</p>
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* SECTION A — INCIDENT INFORMATION */}
          <div className="space-y-3 pb-6 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 text-teal-700">
              <span className="w-6 h-6 rounded-full bg-teal-100 text-teal-800 text-xs flex items-center justify-center font-bold">A</span>
              Incident Information
            </h3>

            <Select
              label="Incident Type"
              value={formData.incident_type}
              onChange={(e) => {
                setFormData({ ...formData, incident_type: e.target.value });
                setFieldErrors({ ...fieldErrors, incident_type: null });
              }}
              options={INCIDENT_OPTIONS}
              error={fieldErrors.incident_type}
              required
            />

            {formData.incident_type === 'OTHER' && (
              <Input
                label="Other Incident Description"
                value={formData.other_incident_description}
                onChange={(e) => {
                  setFormData({ ...formData, other_incident_description: e.target.value });
                  setFieldErrors({ ...fieldErrors, other_incident_description: null });
                }}
                error={fieldErrors.other_incident_description}
                placeholder="Specify the observed incident..."
                required
              />
            )}
          </div>

          {/* SECTION B — PEOPLE AFFECTED */}
          <div className="space-y-3 pb-6 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 text-teal-700">
              <span className="w-6 h-6 rounded-full bg-teal-100 text-teal-800 text-xs flex items-center justify-center font-bold">B</span>
              People Affected
            </h3>

            <Input
              label="Number of Affected People"
              type="number"
              min="1"
              value={formData.affected_people_count}
              onChange={(e) => {
                setFormData({ ...formData, affected_people_count: e.target.value });
                setFieldErrors({ ...fieldErrors, affected_people_count: null });
              }}
              error={fieldErrors.affected_people_count}
              helperText="Must be an integer of at least 1"
              required
            />
          </div>

          {/* SECTION C — INCIDENT DESCRIPTION */}
          <div className="space-y-3 pb-6 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 text-teal-700">
                <span className="w-6 h-6 rounded-full bg-teal-100 text-teal-800 text-xs flex items-center justify-center font-bold">C</span>
                Incident Description
              </h3>
              <span className="text-xs text-slate-400 font-mono">
                {MAX_DESC_CHARS - formData.description.length} chars left
              </span>
            </div>

            <Textarea
              label="Describe what you can see"
              value={formData.description}
              maxLength={MAX_DESC_CHARS}
              onChange={(e) => {
                setFormData({ ...formData, description: e.target.value });
                setFieldErrors({ ...fieldErrors, description: null });
              }}
              error={fieldErrors.description}
              placeholder="Provide clear details of what you observed (e.g. 2 vehicles involved near landmark, visible smoke, visible injuries). Do not attempt medical diagnosis."
              rows={4}
              required
            />
          </div>

          {/* SECTION D — LOCATION */}
          <div className="space-y-3 pb-6 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 text-teal-700">
              <span className="w-6 h-6 rounded-full bg-teal-100 text-teal-800 text-xs flex items-center justify-center font-bold">D</span>
              Location Coordinates & Landmark
            </h3>

            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleUseMyLocation}
                icon={Navigation}
                size="sm"
              >
                Use My Current Location
              </Button>
              {geoStatus && <span className="text-xs text-slate-600 italic font-medium">{geoStatus}</span>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <Input
                label="Latitude (-90 to +90)"
                type="number"
                step="any"
                value={formData.latitude}
                onChange={(e) => {
                  setFormData({ ...formData, latitude: e.target.value });
                  setFieldErrors({ ...fieldErrors, latitude: null });
                }}
                error={fieldErrors.latitude}
                placeholder="e.g. 18.52043"
              />
              <Input
                label="Longitude (-180 to +180)"
                type="number"
                step="any"
                value={formData.longitude}
                onChange={(e) => {
                  setFormData({ ...formData, longitude: e.target.value });
                  setFieldErrors({ ...fieldErrors, longitude: null });
                }}
                error={fieldErrors.longitude}
                placeholder="e.g. 73.85674"
              />
            </div>
          </div>

          {/* SECTION E — OPTIONAL PHOTO */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 text-teal-700">
              <span className="w-6 h-6 rounded-full bg-teal-100 text-teal-800 text-xs flex items-center justify-center font-bold">E</span>
              Optional Incident Photo
            </h3>

            {photoPreview ? (
              <div className="relative w-48 h-36 rounded-xl overflow-hidden border border-slate-200 shadow-sm group">
                <img src={photoPreview} alt="Incident preview" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors shadow-md"
                  title="Remove photo"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div>
                <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-300 hover:border-teal-500 rounded-xl cursor-pointer bg-slate-50 transition-colors">
                  <Camera className="w-8 h-8 text-slate-400 mb-2" />
                  <span className="text-xs font-semibold text-slate-700">Click to attach image</span>
                  <span className="text-[11px] text-slate-400 mt-0.5">JPG, PNG or WEBP (Max 5MB)</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handlePhotoChange}
                    className="hidden"
                  />
                </label>
                {fieldErrors.photo && <p className="text-xs text-red-600 font-medium mt-1">{fieldErrors.photo}</p>}
              </div>
            )}
          </div>

          <Button
            type="submit"
            variant="danger"
            className="w-full py-3.5 text-base font-bold shadow-lg"
            isLoading={isSubmitting}
            icon={Send}
          >
            Submit Emergency Report
          </Button>
        </form>
      </Card>
    </div>
  );
}
