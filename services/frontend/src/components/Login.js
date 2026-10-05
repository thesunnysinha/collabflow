import React from 'react';
import { Navigate, useLocation, useSearchParams } from 'react-router-dom';
import { Alert, Box, Button, Container, Paper, Typography } from '@mui/material';
import { GitHub } from '@mui/icons-material';
import { API_BASE_URL } from '../config';
import { useAuth, rememberReturnTo } from '../auth';

const ERRORS = {
  access_denied: 'GitHub sign-in was cancelled.',
  invalid_state: 'Your sign-in session expired. Please try again.',
  invalid_request: 'GitHub returned an unexpected response. Please try again.',
  github_failed: 'Could not complete sign-in with GitHub. Please try again.'
};

const Login = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [params] = useSearchParams();
  const from = location.state?.from || '/';

  if (user) return <Navigate to={from} replace />;

  const errorCode = params.get('error');
  const signIn = () => {
    rememberReturnTo(from);
    // Full-page navigation: the backend redirects on to GitHub.
    window.location.assign(`${API_BASE_URL}/auth/github`);
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center',
      background: 'linear-gradient(135deg, #6366f1 0%, #2563eb 100%)' }}>
      <Container maxWidth="xs">
        <Paper elevation={6} sx={{ p: 4, borderRadius: 4, textAlign: 'center' }}>
          <Typography variant="h4" fontWeight={700} gutterBottom>CollabFlow</Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>Sign in to create and edit documents.</Typography>
          {errorCode && <Alert severity="error" sx={{ mb: 2 }}>{ERRORS[errorCode] || ERRORS.github_failed}</Alert>}
          <Button fullWidth size="large" variant="contained" startIcon={<GitHub />} onClick={signIn}
            sx={{ py: 1.4, bgcolor: '#24292f', '&:hover': { bgcolor: '#1b1f23' } }}>
            Continue with GitHub
          </Button>
        </Paper>
      </Container>
    </Box>
  );
};

export default Login;
