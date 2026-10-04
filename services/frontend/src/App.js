import React from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import DocumentEditor from './components/DocumentEditor';
import Home from './components/Home';
import Login from './components/Login';
import { AuthProvider, RequireAuth } from './auth';

function App() {
    return (
        <AuthProvider>
            <Router>
                <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/" element={<RequireAuth><Home /></RequireAuth>} />
                    <Route path="/document/:id" element={<RequireAuth><DocumentEditor /></RequireAuth>} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </Router>
        </AuthProvider>
    );
}

export default App;
