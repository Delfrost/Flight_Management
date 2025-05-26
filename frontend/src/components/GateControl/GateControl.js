import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import toast from 'react-hot-toast';
import { FaPlane, FaUsers, FaClock, FaCheckCircle, FaTimesCircle } from 'react-icons/fa';
import { useSocket } from '../../hooks/useSocket';
import { airplaneAPI } from '../../services/api';
import LoadingSpinner from '../Common/LoadingSpinner';

const GateControl = () => {
  const { boardingQueue, passengers, isConnected } = useSocket();
  const [currentTime, setCurrentTime] = useState(new Date());
  const queryClient = useQueryClient();

  // Fetch boarding queue data
  const { data: queueData, isLoading, error } = useQuery(
    'gateControl',
    () => airplaneAPI.getGateControl(),
    {
      refetchInterval: 30000,
    }
  );

  // Close passenger mutation
  const closePatientMutation = useMutation(
    (passengerId) => airplaneAPI.closePassenger(passengerId),
    {
      onSuccess: () => {
        toast.success('Passenger processed successfully!');
        queryClient.invalidateQueries('gateControl');
      },
      onError: (error) => {
        toast.error(error.message || 'Failed to process passenger');
      },
    }
  );

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  const handleClosePassenger = (passengerId) => {
    closePatientMutation.mutate(passengerId);
  };

  if (isLoading) {
    return <LoadingSpinner message="Loading gate control dashboard..." />;
  }

  if (error) {
    return (
      <div className="form-container text-center">
        <div className="text-red-600 mb-4">
          <p>Error loading gate control: {error.message}</p>
        </div>
        <button 
          onClick={() => window.location.reload()} 
          className="btn btn-primary"
        >
          Retry
        </button>
      </div>
    );
  }

  const queue = boardingQueue.length > 0 ? boardingQueue : queueData?.queue || [];
  const allPassengers = Object.keys(passengers).length > 0 ? passengers : queueData?.passengers || {};

  return (
    <div className="form-container">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="text-center mb-6">
          <h2 className="text-3xl font-bold text-gray-800 mb-2">Gate Control Dashboard</h2>
          <p className="text-gray-600">Manage passenger boarding process</p>
        </div>

        {/* Status Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="card">
            <div className="card-body text-center">
              <FaUsers className="text-3xl text-blue-600 mb-2 mx-auto" />
              <h3 className="text-xl font-bold">{queue.length}</h3>
              <p className="text-gray-600">Passengers in Queue</p>
            </div>
          </div>
          
          <div className="card">
            <div className="card-body text-center">
              <FaClock className="text-3xl text-green-600 mb-2 mx-auto" />
              <h3 className="text-xl font-bold">{currentTime.toLocaleTimeString()}</h3>
              <p className="text-gray-600">Current Time</p>
            </div>
          </div>
          
          <div className="card">
            <div className="card-body text-center">
              <div className={`text-3xl mb-2 mx-auto ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
                {isConnected ? <FaCheckCircle /> : <FaTimesCircle />}
              </div>
              <h3 className="text-xl font-bold">{isConnected ? 'Connected' : 'Disconnected'}</h3>
              <p className="text-gray-600">Real-time Status</p>
            </div>
          </div>
        </div>

        {/* Boarding Queue */}
        <div className="card">
          <div className="card-header">
            <h3 className="flex items-center gap-2">
              <FaPlane />
              Current Boarding Queue
            </h3>
          </div>
          <div className="card-body">
            {queue.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <FaUsers className="text-4xl mb-4 mx-auto" />
                <p>No passengers currently in the boarding queue</p>
              </div>
            ) : (
              <div className="space-y-3">
                <AnimatePresence>
                  {queue.map(([priority, timeSlot, passengerId], index) => {
                    const passenger = allPassengers[passengerId];
                    
                    return (
                      <motion.div
                        key={passengerId}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex items-center justify-between p-4 border rounded-lg bg-gray-50"
                      >
                        <div className="flex items-center gap-4">
                          <div className="text-2xl font-bold text-gray-600">
                            #{index + 1}
                          </div>
                          <div>
                            <div className="font-semibold text-lg">
                              {passenger?.name || `Passenger ${passengerId}`}
                            </div>
                            <div className="text-sm text-gray-600">
                              Flight: {passenger?.flightNumber || 'Unknown'} • 
                              Class: {passenger?.boardingClass || 'Economy'} • 
                              Boarding Pass: {passenger?.boardingPass || 'N/A'}
                            </div>
                            {passenger?.specialNeeds && (
                              <div className="text-sm text-orange-600 mt-1">
                                Special Assistance: {passenger.specialNeeds}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <div className={`priority-badge priority-${priority}`}>
                              Priority {priority}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {timeSlot}
                            </div>
                          </div>
                          
                          <button
                            onClick={() => handleClosePassenger(passengerId)}
                            disabled={closePatientMutation.isLoading}
                            className="btn btn-success"
                          >
                            {closePatientMutation.isLoading ? (
                              <LoadingSpinner size="small" />
                            ) : (
                              <>
                                <FaCheckCircle />
                                Board
                              </>
                            )}
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default GateControl;