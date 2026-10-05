import React, { useEffect, useRef } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { CircularProgress, Box } from '@mui/material';
import { useAuth, takeReturnTo } from '../auth';

// Landing page after GitHub sign-in. The backend passes the session token in the URL
// fragment (#token=...), which is never sent to a server.
const AuthCallback = () => {
  const { completeLogin } = useAuth();
  const navigate = useNavigate();
  const started = useRef(false);
  const token = new URLSearchParams(window.location.hash.slice(1)).get('token');

  useEffect(() => {
    if (!token || started.current) return;
    started.current = true;
    // Remove the token from the address bar and history immediately.
    window.history.replaceState(null, '', window.location.pathname);
    completeLogin(token)
      .then(() => navigate(takeReturnTo(), { replace: true }))
      .catch(() => navigate('/login?error=github_failed', { replace: true }));
  }, [token, completeLogin, navigate]);

  if (!token && !started.current) return <Navigate to="/login?error=github_failed" replace />;
  return <Box display="flex" justifyContent="center" mt={8}><CircularProgress /></Box>;
};

export default AuthCallback;
