import axios from 'axios';
import { db } from '../offline/db';
import { generateUUID } from '../utils/uuid';

export const driverService = {
  /**
   * Fetch active assignment for current logged in driver
   */
  async getMyAssignments() {
    try {
      const response = await axios.get('/api/driver/assignments/');
      return response.data.results || response.data || [];
    } catch (error) {
      console.error('Error fetching driver assignments:', error);
      throw error;
    }
  },

  /**
   * Fetch single assignment details by UUID
   */
  async getAssignmentDetails(uuid) {
    try {
      const response = await axios.get(`/api/driver/assignments/${uuid}/`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching assignment ${uuid}:`, error);
      throw error;
    }
  },

  /**
   * Execute state machine status transition (online or offline)
   */
  async transitionStatus(uuid, actionEndpoint, newStatus, locationData = null, isOnline = true) {
    const timestamp = new Date().toISOString();

    if (!isOnline) {
      // Offline mode: store locally in IndexedDB
      const eventUUID = generateUUID();
      const offlineEvent = {
        event_uuid: eventUUID,
        assignment_uuid: uuid,
        status: newStatus,
        latitude: locationData?.latitude || null,
        longitude: locationData?.longitude || null,
        accuracy: locationData?.accuracy || null,
        timestamp: timestamp,
        sync_status: 'PENDING'
      };

      await db.driver_events.add(offlineEvent);

      return {
        offline: true,
        status: 'saved_offline',
        message: 'Saved Offline — Pending Sync',
        event: offlineEvent
      };
    }

    // Online mode: call backend REST API
    try {
      const payload = locationData ? {
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        accuracy: locationData.accuracy
      } : {};

      const response = await axios.post(`/api/driver/assignments/${uuid}/${actionEndpoint}/`, payload);
      return {
        offline: false,
        status: 'success',
        message: response.data.message || 'Status updated successfully',
        assignment: response.data.assignment
      };
    } catch (error) {
      console.error(`Error updating status ${actionEndpoint}:`, error);
      const detail = error.response?.data?.detail || 'Failed to update assignment status.';
      throw new Error(detail);
    }
  },

  /**
   * Periodic location update during active assignment
   */
  async updateLocation(uuid, locationData, isOnline = true) {
    if (!locationData || !locationData.latitude || !locationData.longitude) return;

    if (isOnline) {
      try {
        await axios.post(`/api/driver/assignments/${uuid}/location/`, {
          latitude: locationData.latitude,
          longitude: locationData.longitude,
          accuracy: locationData.accuracy
        });
      } catch (err) {
        console.warn('Failed to send live location update to backend:', err);
      }
    }
  }
};
