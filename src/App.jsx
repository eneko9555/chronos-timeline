import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { TimelinePage } from './pages/TimelinePage';

// Simple protected route wrapper is handled inside pages for simplicity or here
// Let's rely on pages checking token to redirect if needed, or better, a wrapper:

import { useAuth } from './context/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { currentUser, loading } = useAuth(); // Assuming loading is exposed, let's check AuthContext
  if (!currentUser) { // If implementation of useAuth doesn't expose loading properly, might flickr. 
    // AuthContext in this codebase exposes !loading && children, so initially it renders null until loaded.
    return <Navigate to="/" />;
  }
  return children;
};

// However, AuthProvider only renders children when !loading. 
// So inside AuthProvider, if currentUser is null, we are truly logged out.

function App() {
  return (
    <Router>
      {/* AuthProvider is up in main.jsx, wait. 
           In main.jsx we wrapped <App/> with <AuthProvider>.
           So we can use useAuth here! 
       */}
      <AppRoutes />
    </Router>
  );
}

const AppRoutes = () => {
  const { currentUser } = useAuth();

  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/dashboard" element={currentUser ? <DashboardPage /> : <Navigate to="/" />} />
      <Route path="/timeline/:id" element={currentUser ? <TimelinePage /> : <Navigate to="/" />} />
    </Routes>
  );
};

export default App;
