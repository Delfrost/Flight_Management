import React from 'react';
import { motion } from 'framer-motion';
import { FaWifi, FaExclamationTriangle } from 'react-icons/fa';

const ConnectionStatus = ({ isConnected }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`
        fixed top-4 right-4 z-50 px-4 py-2 rounded-lg shadow-lg
        ${isConnected 
          ? 'bg-green-100 text-green-800 border border-green-200' 
          : 'bg-red-100 text-red-800 border border-red-200'
        }
      `}
    >
      <div className="flex items-center gap-2">
        {isConnected ? (
          <>
            <FaWifi className="text-green-600" />
            <span className="text-sm font-medium">Connected</span>
          </>
        ) : (
          <>
            <FaExclamationTriangle className="text-red-600" />
            <span className="text-sm font-medium">Connection Lost</span>
          </>
        )}
      </div>
    </motion.div>
  );
};

export default ConnectionStatus;