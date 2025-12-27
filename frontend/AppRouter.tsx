import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App.tsx';

// Simplified Router - No more login page or protected routes
const AppRouter: React.FC = () => {
    return (
        <BrowserRouter>
            <Routes>
                {/* Main App Route */}
                <Route path="/" element={<App />} />
                <Route path="*" element={<App />} />
            </Routes>
        </BrowserRouter>
    );
};

export default AppRouter;
