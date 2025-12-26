import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import App from './App.tsx';
import Login from './components/Login.tsx';
import AuthCallback from './components/AuthCallback.tsx';
import { authService } from './services/authService.ts';

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    // Check both authService and localStorage
    const hasToken = localStorage.getItem('access_token');
    const isAuthenticated = authService.isAuthenticated() || !!hasToken;

    console.log('ProtectedRoute: isAuthenticated:', isAuthenticated);
    console.log('ProtectedRoute: hasToken:', !!hasToken);

    if (!isAuthenticated) {
        console.log('ProtectedRoute: Not authenticated, redirecting to /login');
        return <Navigate to="/login" replace />;
    }

    console.log('ProtectedRoute: Authenticated, rendering protected content');
    return <>{children}</>;
};

// Main Router Component
const AppRouter: React.FC = () => {
    return (
        <BrowserRouter>
            <Routes>
                {/* Public Routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/auth/callback" element={<AuthCallback />} />

                {/* Protected Routes */}
                <Route
                    path="/"
                    element={
                        <ProtectedRoute>
                            <App />
                        </ProtectedRoute>
                    }
                />

                {/* Catch all - redirect to home */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </BrowserRouter>
    );
};

export default AppRouter;
