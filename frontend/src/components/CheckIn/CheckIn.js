import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery } from 'react-query';
import toast from 'react-hot-toast';
import { FaUser, FaPhone, FaPlane, FaChair, FaCalendarAlt } from 'react-icons/fa';
import { airplaneAPI } from '../../services/api';
import LoadingSpinner from '../Common/LoadingSpinner';

const CheckIn = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    contact: '',
    seatPreference: 'window',
    flightNumber: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  // Fetch available flights
  const { data: flightsData, isLoading: flightsLoading, error: flightsError } = useQuery(
    'flights',
    airplaneAPI.getFlights,
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
    }
  );

  const validateField = (name, value) => {
    let error = '';
    
    switch (name) {
      case 'name':
        if (!value.trim()) {
          error = 'Name is required';
        } else if (value.trim().length < 2) {
          error = 'Name must be at least 2 characters';
        }
        break;
      case 'age':
        const age = parseInt(value);
        if (!value) {
          error = 'Age is required';
        } else if (age < 1 || age > 120) {
          error = 'Please enter a valid age (1-120)';
        }
        break;
      case 'contact':
        if (!value.trim()) {
          error = 'Contact number is required';
        } else if (!/^\+?[\d\s-()]{10,}$/.test(value.replace(/[\s\-\(\)]/g, ''))) {
          error = 'Please enter a valid phone number';
        }
        break;
      case 'flightNumber':
        if (!value) {
          error = 'Please select a flight';
        }
        break;
      default:
        break;
    }
    
    return error;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleInputBlur = (e) => {
    const { name, value } = e.target;
    const error = validateField(name, value);
    if (error) {
      setErrors(prev => ({ ...prev, [name]: error }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    Object.keys(formData).forEach(key => {
      const error = validateField(key, formData[key]);
      if (error) {
        newErrors[key] = error;
      }
    });
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please correct the errors in the form');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const result = await airplaneAPI.checkIn(formData);
      
      if (result.success) {
        toast.success(`Check-in successful! Boarding pass: ${result.boardingPass}`);
        
        // Navigate to flight details page
        setTimeout(() => {
          navigate(`/flight-details/${result.passengerId}`);
        }, 1500);
      }
    } catch (error) {
      console.error('Check-in error:', error);
      toast.error(error.message || 'Check-in failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (flightsLoading) {
    return <LoadingSpinner message="Loading available flights..." />;
  }

  if (flightsError) {
    return (
      <div className="form-container text-center">
        <div className="text-red-600 mb-4">
          <p>Error loading flights: {flightsError.message}</p>
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

  return (
    <div className="form-container">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="text-center mb-6">
          <h2 className="text-3xl font-bold text-gray-800 mb-2">Passenger Check-In</h2>
          <p className="text-gray-600">Please provide your details to check in for your flight</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="form-grid">
            {/* Name Field */}
            <div className="form-group">
              <label htmlFor="name">
                <FaUser className="inline mr-2" />
                Full Name *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                onBlur={handleInputBlur}
                className={errors.name ? 'error' : ''}
                placeholder="Enter your full name"
                required
              />
              {errors.name && (
                <div className="error-message">
                  {errors.name}
                </div>
              )}
            </div>

            {/* Age Field */}
            <div className="form-group">
              <label htmlFor="age">
                <FaCalendarAlt className="inline mr-2" />
                Age *
              </label>
              <input
                type="number"
                id="age"
                name="age"
                value={formData.age}
                onChange={handleInputChange}
                onBlur={handleInputBlur}
                className={errors.age ? 'error' : ''}
                placeholder="Enter your age"
                min="1"
                max="120"
                required
              />
              {errors.age && (
                <div className="error-message">
                  {errors.age}
                </div>
              )}
            </div>

            {/* Contact Field */}
            <div className="form-group">
              <label htmlFor="contact">
                <FaPhone className="inline mr-2" />
                Contact Number *
              </label>
              <input
                type="tel"
                id="contact"
                name="contact"
                value={formData.contact}
                onChange={handleInputChange}
                onBlur={handleInputBlur}
                className={errors.contact ? 'error' : ''}
                placeholder="Enter your phone number"
                required
              />
              {errors.contact && (
                <div className="error-message">
                  {errors.contact}
                </div>
              )}
            </div>

            {/* Flight Selection */}
            <div className="form-group">
              <label htmlFor="flightNumber">
                <FaPlane className="inline mr-2" />
                Select Flight *
              </label>
              <select
                id="flightNumber"
                name="flightNumber"
                value={formData.flightNumber}
                onChange={handleInputChange}
                onBlur={handleInputBlur}
                className={errors.flightNumber ? 'error' : ''}
                required
              >
                <option value="">Choose your flight</option>
                {flightsData?.flights && Object.entries(flightsData.flights).map(([flightNumber, flight]) => (
                  <option key={flightNumber} value={flightNumber}>
                    {flightNumber} - {flight.destination} (Departure: {flight.departure})
                  </option>
                ))}
              </select>
              {errors.flightNumber && (
                <div className="error-message">
                  {errors.flightNumber}
                </div>
              )}
            </div>

            {/* Seat Preference */}
            <div className="form-group">
              <label htmlFor="seatPreference">
                <FaChair className="inline mr-2" />
                Seat Preference
              </label>
              <select
                id="seatPreference"
                name="seatPreference"
                value={formData.seatPreference}
                onChange={handleInputChange}
              >
                <option value="window">Window Seat</option>
                <option value="aisle">Aisle Seat</option>
                <option value="middle">Middle Seat</option>
                <option value="no-preference">No Preference</option>
              </select>
            </div>
          </div>

          {/* Flight Details Display */}
          {formData.flightNumber && flightsData?.flights[formData.flightNumber] && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              transition={{ duration: 0.3 }}
              className="card"
            >
              <div className="card-header">
                <h3>Flight Details</h3>
              </div>
              <div className="card-body">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <strong>Flight:</strong> {formData.flightNumber}
                  </div>
                  <div>
                    <strong>Destination:</strong> {flightsData.flights[formData.flightNumber].destination}
                  </div>
                  <div>
                    <strong>Departure:</strong> {flightsData.flights[formData.flightNumber].departure}
                  </div>
                  <div>
                    <strong>Gate:</strong> {flightsData.flights[formData.flightNumber].gate}
                  </div>
                  <div className="col-span-2">
                    <strong>Aircraft:</strong> {flightsData.flights[formData.flightNumber].aircraft}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Submit Button */}
          <div className="text-center">
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn btn-primary btn-lg"
            >
              {isSubmitting ? (
                <>
                  <LoadingSpinner />
                  Processing Check-In...
                </>
              ) : (
                <>
                  <FaPlane />
                  Check In
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default CheckIn;