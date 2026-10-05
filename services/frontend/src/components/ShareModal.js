import React, { useState } from 'react';
import { Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Typography } from '@mui/material';
import apiClient from '../services/apiService';

const ShareModal = ({ open, onClose, documentId, isOwner, collaborators, onChanged }) => {
  const [username, setUsername] = useState('');
  const [error, setError] = useState(null);

  const add = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      await apiClient.post(`/documents/${documentId}/collaborators`, { username: username.trim() });
      setUsername('');
      onChanged();
    } catch (err) {
      setError(err.message);
    }
  };

  const remove = async (userId) => {
    setError(null);
    try {
      await apiClient.delete(`/documents/${documentId}/collaborators/${userId}`);
      onChanged();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Share document</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Typography variant="body2" color="text.secondary" gutterBottom>
          People with access can view and edit.
        </Typography>
        <Box display="flex" gap={1} flexWrap="wrap" mb={2}>
          {collaborators.length === 0 && <Typography variant="body2">Not shared with anyone yet.</Typography>}
          {collaborators.map((c) => (
            <Chip key={c._id} label={c.username} onDelete={isOwner ? () => remove(c._id) : undefined} />
          ))}
        </Box>
        {isOwner && (
          <Box component="form" onSubmit={add} display="flex" gap={1}>
            <TextField size="small" fullWidth label="GitHub username" value={username}
              onChange={(e) => setUsername(e.target.value)} />
            <Button type="submit" variant="contained" disabled={!username.trim()}>Add</Button>
          </Box>
        )}
      </DialogContent>
      <DialogActions><Button onClick={onClose}>Close</Button></DialogActions>
    </Dialog>
  );
};

export default ShareModal;
