import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery } from 'react-query';
import toast from 'react-hot-toast';
import { FaUser, FaPlane, FaStar, FaWheelchair, FaUtensils, FaChild } from 'react-icons/fa';
import { airplaneAPI } from '../../services/api';
import LoadingSpinner from '../Common/LoadingSpinner';

const FlightDetails = () => {
  const { passengerId } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    boardingClass: 'economy',
    specialNeeds: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch passenger details
  const { data: passengerData, isLoading, error } = useQuery(
    ['passenger', passengerId],
    () => airplaneAPI.getPassenger(parseInt(passengerId)),
    {
      enabled: !!passengerId,
      retry: 2,
    }
  );

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const result = await airplaneAPI.addFlightDetails({
        passengerId: parseInt(passengerId),
        ...formData,
      });

      if (result.success) {
        toast.success('Flight details updated successfully!');
        
        // Navigate to boarding queue
        setTimeout(() => {
          navigate(`/boarding-queue/${passengerId}`);
        }, 1500);
      }
    } catch (error) {
      console.error('Flight details error:', error);
      toast.error(error.message || 'Failed to update flight details');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <LoadingSpinner message="Loading passenger details..." />;
  }

  if (error) {
    return (
      <div className="form-container text-center">
        <div className="text-red-600 mb-4">
          <p>Error loading passenger details: {error.message}</p>
        </div>
        <button 
          onClick={() => navigate('/')} 
          className="btn btn-primary"
        >
          Back to Check-In
        </button>
      </div>
    );
  }

  const passenger = passengerData?.passenger;

  return (
    <div className="form-container">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="text-center mb-6">
          <h2 className="text-3xl font-bold text-gray-800 mb-2">Flight Details</h2>
          <p className="text-gray-600">Complete your boarding information</p>
        </div>

        {/* Passenger Info Card */}
        {passenger && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="card mb-6"
          >
            <div className="card-header">
              <h3 className="flex items-center gap-2">
                <FaUser />
                Passenger Information
              </h3>
            </div>
            <div className="card-body">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <strong>Name:</strong> {passenger.name}
                </div>
                <div>
                  <strong>Age:</strong> {passenger.age}
                </div>
                <div>
                  <strong>Contact:</strong> {passenger.contact}
                </div>
                <div>
                  <strong>Boarding Pass:</strong> 
                  <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 rounded font-mono">
                    {passenger.boardingPass}
                  </span>
                </div>
                <div>
                  <strong>Flight:</strong> {passenger.flightNumber}
                </div>
                <div>
                  <strong>Seat Preference:</strong> {passenger.seatPreference}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Boarding Class Selection */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="form-group"
          >
            <label className="text-lg font-semibold mb-4 block">
              <FaStar className="inline mr-2" />
              Select Boarding Class
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                {
                  value: 'first',
                  label: 'First Class',
                  description: 'Premium boarding, priority service',
                  icon: '👑',
                  color: 'border-yellow-400 bg-yellow-50'
                },
                {
                  value: 'business',
                  label: 'Business Class',
                  description: 'Early boarding, enhanced comfort',
                  icon: '💼',
                  color: 'border-blue-400 bg-blue-50'
                },
                {
                  value: 'economy',
                  label: 'Economy Class',
                  description: 'Standard boarding process',
                  icon: '✈️',
                  color: 'border-gray-400 bg-gray-50'
                }
              ].map((classOption) => (
                <label
                  key={classOption.value}
                  className={`
                    cursor-pointer border-2 rounded-lg p-4 transition-all duration-200
                    ${formData.boardingClass === classOption.value 
                      ? `${classOption.color} border-opacity-100` 
                      : 'border-gray-200 hover:border-gray-300'
                    }
                  `}
                >
                  <input
                    type="radio"
                    name="boardingClass"
                    value={classOption.value}
                    checked={formData.boardingClass === classOption.value}
                    onChange={handleInputChange}
                    className="sr-only"
                  />
                  <div className="text-center">
                    <div className="text-2xl mb-2">{classOption.icon}</div>
                    <div className="font-semibold text-gray-800">{classOption.label}</div>
                    <div className="text-sm text-gray-600 mt-1">{classOption.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </motion.div>

          {/* Special Needs */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="form-group"
          >
            <label htmlFor="specialNeeds" className="text-lg font-semibold mb-4 block">
              <FaWheelchair className="inline mr-2" />
              Special Assistance (Optional)
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              {[
                { value: 'wheelchair', label: 'Wheelchair', icon: <FaWheelchair /> },
                { value: 'dietary', label: 'Dietary Needs', icon: <FaUtensils /> },
                { value: 'infant', label: 'Traveling with Infant', icon: <FaChild /> },
                { value: 'medical', label: 'Medical Assistance', icon: '🏥' },
              ].map((need) => (
                <button
                  key={need.value}
                  type="button"
                  onClick={() => {
                    const currentNeeds = formData.specialNeeds.split(',').filter(n => n.trim());
                    const hasNeed = currentNeeds.includes(need.value);
                    
                    if (hasNeed) {
                      const updatedNeeds = currentNeeds.filter(n => n !== need.value);
                      setFormData(prev => ({ ...prev, specialNeeds: updatedNeeds.join(',') }));
                    } else {
                      const updatedNeeds = [...currentNeeds, need.value];
                      setFormData(prev => ({ ...prev, specialNeeds: updatedNeeds.join(',') }));
                    }
                  }}
                  className={`
                    p-3 rounded-lg border-2 transition-all duration-200 text-sm
                    ${formData.specialNeeds.includes(need.value)
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-300 hover:border-gray-400 text-gray-700'
                    }
                  `}
                >
                  <div className="flex flex-col items-center gap-1">
                    {typeof need.icon === 'string' ? (
                      <span className="text-lg">{need.icon}</span>
                    ) : (
                      need.icon
                    )}
                    <span>{need.label}</span>
                  </div>
                </button>
              ))}
            </div>
            <textarea
              id="specialNeeds"
              name="specialNeeds"
              value={formData.specialNeeds}
              onChange={handleInputChange}
              placeholder="Please describe any additional special assistance needed..."
              className="w-full"
              rows="3"
            />
          </motion.div>

          {/* Priority Information */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="card"
          >
            <div className="card-header">
              <h3>Boarding Priority Information</h3>
            </div>
            <div className="card-body">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="priority-badge priority-1">Priority 1</div>
                  <span>First Class, Passengers with special needs</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="priority-badge priority-2">Priority 2</div>
                  <span>Business Class, Frequent flyers</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="priority-badge priority-3">Priority 3</div>
                  <span>Economy Class</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Submit Button */}
          <div className="text-center">
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn btn-primary btn-lg"
            >
              {isSubmitting ? (
                <>
                  <LoadingSpinner size="small" />
                  Processing...
                </>
              ) : (
                <>
                  <FaPlane />
                  Continue to Boarding Queue
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default FlightDetails;