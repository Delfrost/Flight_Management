import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [boardingQueue, setBoardingQueue] = useState([]);
  const [passengers, setPassengers] = useState({});

  useEffect(() => {
    const socketURL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';
    const newSocket = io(socketURL, {
      transports: ['websocket', 'polling'],
      timeout: 20000,
    });

    // Connection event handlers
    newSocket.on('connect', () => {
      console.log('Connected to server');
      setIsConnected(true);
      toast.success('Connected to real-time updates');
    });

    newSocket.on('disconnect', (reason) => {
      console.log('Disconnected from server:', reason);
      setIsConnected(false);
      toast.error('Connection lost. Attempting to reconnect...');
    });

    newSocket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      setIsConnected(false);
      toast.error('Failed to connect to server');
    });

    // Boarding update handler
    newSocket.on('boarding_update', (data) => {
      console.log('Boarding update received:', data);
      setBoardingQueue(data.queue || []);
      setPassengers(data.passengers || {});
      
      // Show notification for boarding updates
      toast.success('Boarding queue updated', {
        duration: 2000,
        icon: '✈️',
      });
    });

    // Flight announcement handler
    newSocket.on('flight_announcement', (data) => {
      console.log('Flight announcement:', data);
      toast(data.message, {
        duration: 5000,
        icon: '📢',
        style: {
          background: '#3b82f6',
          color: 'white',
        },
      });
    });

    setSocket(newSocket);

    // Cleanup on unmount
    return () => {
      newSocket.close();
    };
  }, []);

  const joinPassengerRoom = (passengerId) => {
    if (socket && isConnected) {
      socket.emit('join_passenger_room', { passengerId });
    }
  };

  const emitEvent = (eventName, data) => {
    if (socket && isConnected) {
      socket.emit(eventName, data);
    } else {
      console.warn('Socket not connected. Cannot emit event:', eventName);
    }
  };

  const value = {
    socket,
    isConnected,
    boardingQueue,
    passengers,
    joinPassengerRoom,
    emitEvent,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};