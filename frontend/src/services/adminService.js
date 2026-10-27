import axios from 'axios';

export const adminService = {
  // Dashboard Metrics
  async getDashboardMetrics() {
    const res = await axios.get('/api/admin/admin/dashboard/');
    return res.data;
  },

  // Users Management
  async getUsers(params = {}) {
    const res = await axios.get('/api/admin/admin/users/', { params });
    return res.data;
  },

  async createUser(userData) {
    const res = await axios.post('/api/admin/admin/users/', userData);
    return res.data;
  },

  async toggleUserStatus(uuid, isActive) {
    const res = await axios.patch(`/api/admin/admin/users/${uuid}/status/`, { is_active: isActive });
    return res.data;
  },

  // Hospitals Management
  async getHospitals(params = {}) {
    const res = await axios.get('/api/admin/admin/hospitals/', { params });
    return res.data;
  },

  async createHospital(hospitalData) {
    const res = await axios.post('/api/admin/admin/hospitals/', hospitalData);
    return res.data;
  },

  async updateHospital(uuid, hospitalData) {
    const res = await axios.patch(`/api/admin/admin/hospitals/${uuid}/`, hospitalData);
    return res.data;
  },

  // Ambulances Management
  async getAmbulances(params = {}) {
    const res = await axios.get('/api/admin/admin/ambulances/', { params });
    return res.data;
  },

  async createAmbulance(ambulanceData) {
    const res = await axios.post('/api/admin/admin/ambulances/', ambulanceData);
    return res.data;
  },

  async updateAmbulance(uuid, ambulanceData) {
    const res = await axios.patch(`/api/admin/admin/ambulances/${uuid}/`, ambulanceData);
    return res.data;
  },

  // Emergency Cases Overview
  async getCases(params = {}) {
    const res = await axios.get('/api/admin/admin/cases/', { params });
    return res.data;
  },

  // System Analytics
  async getAnalyticsData() {
    const res = await axios.get('/api/admin/admin/analytics/');
    return res.data;
  },

  // Activity Logs
  async getActivityLogs(params = {}) {
    const res = await axios.get('/api/admin/admin/activity/', { params });
    return res.data;
  },

  // AI Models Info
  async getModelsInfo() {
    const res = await axios.get('/api/admin/admin/models/');
    return res.data;
  },

  // Settings & Fusion Weights
  async getSettings() {
    const res = await axios.get('/api/admin/admin/settings/');
    return res.data;
  },

  async updateFusionWeights(weights) {
    const res = await axios.post('/api/admin/admin/settings/', weights);
    return res.data;
  }
};
