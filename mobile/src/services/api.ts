import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// For local dev, use computer's local IP or localhost for iOS simulator, 10.0.2.2 for Android emulator
// Update this with your actual local IP if testing on a physical device.
const LOCAL_IP = '192.168.1.112';

// API Gateway 80 portunda çalıştığı için port eklemiyoruz
const BASE_URL = process.env.EXPO_PUBLIC_API_URL || `http://${LOCAL_IP}`;

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach JWT token
apiClient.interceptors.request.use(async (config) => {
  try {
    const token = await AsyncStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (err) {
    console.error('[API Client] Error reading auth token:', err);
  }
  return config;
});

// Mock login logic for now
export async function ensureAuthenticated() {
  const token = await AsyncStorage.getItem('auth_token');
  if (!token) {
    // Attempt auto login (mock for dev)
    try {
      const res = await axios.post(`${BASE_URL}:3001/api/v1/auth/login`, {
        nationalId: '12345678901',
        password: 'password123'
      });
      if (res.data.data?.token) {
        await AsyncStorage.setItem('auth_token', res.data.data.token);
      }
    } catch (err) {
      // In a real app, redirect to login screen
      console.warn('Could not auto-authenticate:', err);
    }
  }
}
