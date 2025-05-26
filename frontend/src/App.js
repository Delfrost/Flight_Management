import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Toaster } from 'react-hot-toast';
import CheckIn from './components/CheckIn/CheckIn';
import FlightDetails from './components/FlightDetails/FlightDetails';
import BoardingQueue from './components/BoardingQueue/BoardingQueue';
import NotFound from './components/Common/NotFound';
import './styles/index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <header className="bg-white shadow-sm border-b">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center py-4">
                <h1 className="text-2xl font-bold text-gray-900">
                  Flight Management System
                </h1>
                <nav className="flex space-x-4">
                  <a href="/" className="text-blue-600 hover:text-blue-800">
                    Check-in
                  </a>
                  <a href="/flights" className="text-blue-600 hover:text-blue-800">
                    Flight Dashboard
                  </a>
                </nav>
              </div>
            </div>
          </header>
          
          <main className="py-8">
            <Routes>
              <Route path="/" element={<CheckIn />} />
              <Route path="/flight/:passengerId" element={<FlightDetails />} />
              <Route path="/boarding/:passengerId" element={<BoardingQueue />} />
              <Route path="/flights" element={<FlightDashboard />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
        </div>
        <Toaster position="top-right" />
      </Router>
    </QueryClientProvider>
  );
}

// Flight Dashboard component
const FlightDashboard = () => {
  return (
    <div className="form-container">
      <h2 className="text-2xl font-bold mb-4">Flight Dashboard</h2>
      <p>View and manage all flight operations here.</p>
    </div>
  );
};

export default App;