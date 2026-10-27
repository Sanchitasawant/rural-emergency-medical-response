
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback
} from 'react';
import axios from 'axios';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('ruralcare_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [token, setToken] = useState(
    () => localStorage.getItem('ruralcare_access_token') || null
  );

  const [refreshToken, setRefreshToken] = useState(
    () => localStorage.getItem('ruralcare_refresh_token') || null
  );

  const [loading, setLoading] = useState(true);

  // Set default authorization header whenever token changes
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [token]);

  // Setup Axios Interceptor for Token Refresh
  useEffect(() => {
    const responseInterceptor = axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        if (
          error.response?.status === 401 &&
          originalRequest &&
          !originalRequest._retry &&
          refreshToken &&
          !originalRequest.url?.includes('/api/auth/refresh/')
        ) {
          originalRequest._retry = true;

          try {
            // Do not use the shared interceptor for the refresh request
            const refreshRes = await axios.post(
              '/api/auth/refresh/',
              { refresh: refreshToken },
              {
                skipAuthRefresh: true
              }
            );

            const newAccess = refreshRes.data.access;

            if (!newAccess) {
              throw new Error('Refresh response did not contain an access token.');
            }

            localStorage.setItem('ruralcare_access_token', newAccess);
            setToken(newAccess);

            axios.defaults.headers.common['Authorization'] =
              `Bearer ${newAccess}`;

            originalRequest.headers = originalRequest.headers || {};
            originalRequest.headers['Authorization'] = `Bearer ${newAccess}`;

            return axios(originalRequest);
          } catch (refreshErr) {
            await logout();
            return Promise.reject(refreshErr);
          }
        }

        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.response.eject(responseInterceptor);
    };
  }, [refreshToken, token]);

  // Restore & Validate Authentication State on Page Refresh
  const restoreAuth = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const res = await axios.get('/api/auth/me/');
      setCurrentUser(res.data);
      localStorage.setItem('ruralcare_user', JSON.stringify(res.data));
    } catch (e) {
      // If offline or network error, keep cached user
      if (!navigator.onLine) {
        console.log('Offline mode: Preserving locally cached session');
      } else if (e.response && e.response.status === 401) {
        await logout();
      }
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    restoreAuth();
  }, [restoreAuth]);

  const login = async (emailOrUsername, password) => {
    setLoading(true);

    if (!navigator.onLine) {
      setLoading(false);
      return {
        success: false,
        error:
          'Offline Mode: Online authentication requires active internet connection for new sign-ins.'
      };
    }

    try {
      const res = await axios.post('/api/auth/login/', {
        username: emailOrUsername,
        password
      });

      const { access, refresh, user: userData } = res.data;

      localStorage.setItem('ruralcare_access_token', access);
      localStorage.setItem('ruralcare_refresh_token', refresh);
      localStorage.setItem('ruralcare_user', JSON.stringify(userData));

      setToken(access);
      setRefreshToken(refresh);
      setCurrentUser(userData);
      setLoading(false);

      return { success: true, user: userData };
    } catch (err) {
      setLoading(false);

      let errorMsg = 'Invalid email/username or password.';

      if (!err.response) {
        errorMsg = 'Network error. Please check your server connection.';
      } else if (err.response.data?.detail) {
        errorMsg = err.response.data.detail;
      }

      return { success: false, error: errorMsg };
    }
  };

  const register = async (formData) => {
    setLoading(true);

    if (!navigator.onLine) {
      setLoading(false);
      return {
        success: false,
        error: 'Offline Mode: Registration requires active internet connection.'
      };
    }

    try {
      await axios.post('/api/auth/register/', formData);
      setLoading(false);
      return { success: true };
    } catch (err) {
      setLoading(false);

      let errors = {};

      if (err.response && err.response.data) {
        errors = err.response.data;
      } else {
        errors = {
          non_field_errors: ['Network error during registration.']
        };
      }

      return { success: false, error: errors };
    }
  };

  const logout = async () => {
    if (token && refreshToken && navigator.onLine) {
      try {
        await axios.post('/api/auth/logout/', {
          refresh_token: refreshToken
        });
      } catch (e) {
        // Ignore logout errors
      }
    }

    localStorage.removeItem('ruralcare_access_token');
    localStorage.removeItem('ruralcare_refresh_token');
    localStorage.removeItem('ruralcare_user');

    setToken(null);
    setRefreshToken(null);
    setCurrentUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAuthenticated: !!currentUser && !!token,
        loading,
        login,
        register,
        logout,
        refreshAuthentication: restoreAuth,
        role: currentUser?.role || 'GUEST'
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
