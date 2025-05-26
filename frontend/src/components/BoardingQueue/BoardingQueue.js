import React from 'react';
import { useParams } from 'react-router-dom';

const BoardingQueue = () => {
  const { passengerId } = useParams();

  return (
    <div className="form-container">
      <div className="card">
        <div className="card-header">
          <h2 className="text-2xl font-bold">Boarding Status</h2>
        </div>
        <div className="card-body text-center">
          <p className="text-lg mb-4">
            Thank you for checking in! Your passenger ID is: <strong>{passengerId}</strong>
          </p>
          <p className="text-gray-600">
            Please wait in the boarding area. You will be notified when it's time to board your flight.
          </p>
        </div>
      </div>
    </div>
  );
};

export default BoardingQueue;