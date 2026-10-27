import axios from 'axios';

export const connectivityService = {
  /**
   * Probe backend health to determine exact connectivity state:
   * 'OFFLINE' | 'ONLINE_UNREACHABLE' | 'ONLINE_REACHABLE'
   */
  async checkConnectivity() {
    if (!navigator.onLine) {
      return 'OFFLINE';
    }

    try {
      const response = await axios.get('/api/health/', { timeout: 4000 });
      if (response.status === 200 && response.data?.status === 'healthy') {
        return 'ONLINE_REACHABLE';
      }
      return 'ONLINE_UNREACHABLE';
    } catch (err) {
      return 'ONLINE_UNREACHABLE';
    }
  }
};
