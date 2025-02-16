import React from 'react';
import { 
  Modal, 
  Box, 
  Typography, 
  TextField, 
  Button, 
  IconButton,
  useTheme,
  Fade,
  Backdrop
} from '@mui/material';
import { PersonAdd, Close } from '@mui/icons-material';
import { motion } from 'framer-motion';

const CollaboratorModal = ({ open, handleClose, handleAddCollaborator }) => {
  const [collaboratorName, setCollaboratorName] = React.useState('');
  const theme = useTheme();

  const onSubmit = (e) => {
    e.preventDefault();
    handleAddCollaborator(collaboratorName);
    setCollaboratorName('');
    handleClose();
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      closeAfterTransition
      BackdropComponent={Backdrop}
      BackdropProps={{ timeout: 500 }}
    >
      <Fade in={open}>
        <Box sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: { xs: '90%', sm: 450 },
          bgcolor: 'background.paper',
          borderRadius: 4,
          boxShadow: 24,
          p: 0,
          overflow: 'hidden'
        }}>
          {/* Header with Gradient */}
          <Box sx={{
            background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
            p: 3,
            position: 'relative'
          }}>
            <IconButton
              sx={{
                position: 'absolute',
                right: 16,
                top: 16,
                color: 'white'
              }}
              onClick={handleClose}
            >
              <Close />
            </IconButton>
            <Typography variant="h5" component="div" sx={{ 
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              gap: 2
            }}>
              <PersonAdd fontSize="large" />
              Add Collaborator
            </Typography>
          </Box>

          {/* Form Content */}
          <Box sx={{ p: 4 }}>
            <form onSubmit={onSubmit}>
              <TextField
                fullWidth
                label="Enter Name"
                variant="outlined"
                value={collaboratorName}
                onChange={(e) => setCollaboratorName(e.target.value)}
                required
                margin="normal"
                InputProps={{
                  sx: { borderRadius: 3 }
                }}
                InputLabelProps={{
                  sx: { 
                    color: 'text.secondary',
                    fontWeight: 500
                  }
                }}
              />
              
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  sx={{
                    mt: 3,
                    py: 1.5,
                    borderRadius: 3,
                    fontSize: '1rem',
                    fontWeight: 600,
                    background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                  }}
                >
                  Invite Collaborator
                </Button>
              </motion.div>
            </form>
          </Box>
        </Box>
      </Fade>
    </Modal>
  );
};

export default CollaboratorModal;