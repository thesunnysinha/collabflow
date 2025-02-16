import React from 'react';
import { 
  Modal, 
  Box, 
  Typography, 
  TextField, 
  Button, 
  useTheme,
  Fade,
  Backdrop
} from '@mui/material';
import { PersonAdd } from '@mui/icons-material';
import { motion } from 'framer-motion';

const CollaboratorModal = ({ open, handleAddCollaborator }) => {
  const [collaboratorName, setCollaboratorName] = React.useState('');
  const theme = useTheme();

  const onSubmit = (e) => {
    e.preventDefault();
    if (collaboratorName.trim()) {
      handleAddCollaborator(collaboratorName.trim());
      setCollaboratorName('');
    }
  };

  return (
    <Modal
      open={open}
      disableEscapeKeyDown
      BackdropComponent={Backdrop}
      BackdropProps={{ 
        style: { pointerEvents: 'none' },
        timeout: 500 
      }}
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
          {/* Header */}
          <Box sx={{
            background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
            p: 3,
          }}>
            <Typography variant="h5" component="div" sx={{ 
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              gap: 2
            }}>
              <PersonAdd fontSize="large" />
              Enter Your Name
            </Typography>
          </Box>

          {/* Form */}
          <Box sx={{ p: 4 }}>
            <form onSubmit={onSubmit}>
              <TextField
                fullWidth
                autoFocus
                label="Your Name"
                variant="outlined"
                value={collaboratorName}
                onChange={(e) => setCollaboratorName(e.target.value)}
                required
                margin="normal"
                InputProps={{ sx: { borderRadius: 3 } }}
              />
              
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  sx={{
                    mt: 3,
                    py: 1.5,
                    borderRadius: 3,
                    background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                  }}
                >
                  Continue Editing
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