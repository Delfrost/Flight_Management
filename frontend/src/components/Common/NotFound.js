import React from 'react';

const NotFound = () => {
  return (
    <div className="form-container text-center">
      <h2 className="text-2xl font-bold mb-4">Page Not Found</h2>
      <p className="text-gray-600 mb-4">The page you're looking for doesn't exist.</p>
      <a href="/" className="btn btn-primary">
        Go Home
      </a>
    </div>
  );
};

export default NotFound;