import React, { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Alert, Box, Button, Container, Link, Paper, TextField, Typography } from '@mui/material';
import { useAuth } from '../auth';

const Login = () => {
  const { user, authenticate } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const from = location.state?.from || '/';
  if (user) return <Navigate to={from} replace />;

  const onSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await authenticate(mode, username.trim(), password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const register = mode === 'register';
  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center',
      background: 'linear-gradient(135deg, #6366f1 0%, #2563eb 100%)' }}>
      <Container maxWidth="xs">
        <Paper elevation={6} sx={{ p: 4, borderRadius: 4 }} component="form" onSubmit={onSubmit}>
          <Typography variant="h4" fontWeight={700} gutterBottom>
            {register ? 'Create account' : 'Sign in'}
          </Typography>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <TextField fullWidth required autoFocus margin="normal" label="Username"
            autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} />
          <TextField fullWidth required margin="normal" label="Password" type="password"
            autoComplete={register ? 'new-password' : 'current-password'}
            helperText={register ? 'At least 8 characters' : undefined}
            value={password} onChange={(e) => setPassword(e.target.value)} />
          <Button fullWidth type="submit" variant="contained" disabled={busy} sx={{ mt: 2, py: 1.2 }}>
            {register ? 'Register' : 'Sign in'}
          </Button>
          <Typography variant="body2" sx={{ mt: 2, textAlign: 'center' }}>
            <Link component="button" type="button" onClick={() => { setError(null); setMode(register ? 'login' : 'register'); }}>
              {register ? 'Already have an account? Sign in' : 'Need an account? Register'}
            </Link>
          </Typography>
        </Paper>
      </Container>
    </Box>
  );
};

export default Login;
