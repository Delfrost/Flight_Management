import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    console.log(`Making ${config.method?.toUpperCase()} request to ${config.url}`);
    return config;
  },
  (error) => {
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    console.log(`Response from ${response.config.url}:`, response.data);
    return response;
  },
  (error) => {
    console.error('Response error:', error);
    
    if (error.response) {
      // Server responded with error status
      const { status, data } = error.response;
      console.error(`HTTP ${status}:`, data);
      
      switch (status) {
        case 404:
          throw new Error(data.error || 'Resource not found');
        case 400:
          throw new Error(data.error || 'Bad request');
        case 500:
          throw new Error(data.error || 'Internal server error');
        default:
          throw new Error(data.error || `HTTP ${status} error`);
      }
    } else if (error.request) {
      // Network error
      throw new Error('Network error - please check your connection');
    } else {
      // Other error
      throw new Error(error.message || 'An unexpected error occurred');
    }
  }
);

// API methods
export const airplaneAPI = {
  // Get all flights
  getFlights: async () => {
    const response = await api.get('/flights');
    return response.data;
  },

  // Check-in passenger
  checkIn: async (passengerData) => {
    const response = await api.post('/check-in', passengerData);
    return response.data;
  },

  // Get passenger details
  getPassenger: async (passengerId) => {
    const response = await api.get(`/passenger/${passengerId}`);
    return response.data;
  },

  // Add flight details
  addFlightDetails: async (flightData) => {
    const response = await api.post('/flight-details', flightData);
    return response.data;
  },

  // Get boarding queue information
  getBoardingQueue: async (passengerId) => {
    const response = await api.get(`/boarding-queue/${passengerId}`);
    return response.data;
  },

  // Get gate control data
  getGateControl: async () => {
    const response = await api.get('/gate-control');
    return response.data;
  },

  // Board passenger
  boardPassenger: async (passengerId) => {
    const response = await api.post('/board-passenger', { passengerId });
    return response.data;
  },

  // Get flight status
  getFlightStatus: async (flightNumber) => {
    const response = await api.get(`/flight-status/${flightNumber}`);
    return response.data;
  },
};

export default api;