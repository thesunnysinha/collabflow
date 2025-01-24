import React from 'react';
import { Modal, Box, Typography, TextField, Button } from '@mui/material';

const style = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 400,
  bgcolor: 'background.paper',
  boxShadow: 24,
  p: 4,
};

const CollaboratorModal = ({ open, handleClose, handleAddCollaborator }) => {
  const [collaboratorName, setCollaboratorName] = React.useState('');

  const onSubmit = (e) => {
    e.preventDefault();
    handleAddCollaborator(collaboratorName);
    setCollaboratorName(''); // Clear input field
    handleClose(); // Close the modal
  };

  return (
    <Modal open={open} onClose={handleClose}>
      <Box sx={style}>
        <Typography variant="h6" component="h2">
          Enter Collaborator Name
        </Typography>
        <form onSubmit={onSubmit}>
          <TextField
            fullWidth
            label="Collaborator Name"
            variant="outlined"
            value={collaboratorName}
            onChange={(e) => setCollaboratorName(e.target.value)}
            required
            margin="normal"
          />
          <Button type="submit" variant="contained" color="primary">
            Add Collaborator
          </Button>
        </form>
      </Box>
    </Modal>
  );
};

export default CollaboratorModal;
