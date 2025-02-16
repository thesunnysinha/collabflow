import React, { useState } from 'react';
import {
  Button,
  Typography,
  Container,
  Box,
  Paper,
  Grid,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Avatar,
  useTheme,
  Modal,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { Description, Group, Edit, CloudDone, Close } from '@mui/icons-material';
import apiClient from '../services/apiService';
import { motion } from 'framer-motion';

const LANGUAGES = [
  'javascript', 'python', 'typescript', 'html', 'css', 'java', 'c_cpp', 'ruby'
];
const THEMES = ['github', 'monokai', 'tomorrow', 'twilight'];

const Home = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const [modalOpen, setModalOpen] = useState(false);
  const [documentSettings, setDocumentSettings] = useState({
    title: 'Untitled Document',
    language: 'python',
    theme: 'github'
  });

  const handleNewDocument = async () => {
    try {
      const response = await apiClient.post('/documents', {
        title: documentSettings.title || 'Untitled Document',
        content: '',
        language: documentSettings.language,
        theme: documentSettings.theme
      });
      navigate(`/document/${response.data._id}`);
      setModalOpen(false);
    } catch (error) {
      console.error('Error creating new document:', error);
    }
  };

  const features = [
    { icon: <Group />, text: 'Real-time collaboration' },
    { icon: <Edit />, text: 'Rich text editing' },
    { icon: <CloudDone />, text: 'Auto-save functionality' },
    { icon: <Description />, text: 'Unlimited documents' }
  ];

  const modalStyle = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 400,
    bgcolor: 'background.paper',
    borderRadius: 4,
    boxShadow: 24,
    p: 4,
  };

  return (
    <Box sx={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #6366f1 0%, #2563eb 100%)',
      pt: 15,
      pb: 10
    }}>
      <Container maxWidth="md">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Paper elevation={6} sx={{
            borderRadius: 4,
            p: 6,
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)'
          }}>
            {/* New Document Modal */}
            <Modal open={modalOpen} onClose={() => setModalOpen(false)}>
              <Paper sx={modalStyle}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                  <Typography variant="h6" fontWeight="600">
                    New Document Settings
                  </Typography>
                  <IconButton onClick={() => setModalOpen(false)}>
                    <Close />
                  </IconButton>
                </Box>

                <TextField
                  fullWidth
                  label="Document Title"
                  value={documentSettings.title}
                  onChange={(e) => setDocumentSettings({ ...documentSettings, title: e.target.value })}
                  sx={{ mb: 3 }}
                />

                <FormControl fullWidth sx={{ mb: 3 }}>
                  <InputLabel>Language</InputLabel>
                  <Select
                    value={documentSettings.language}
                    label="Language"
                    onChange={(e) => setDocumentSettings({ ...documentSettings, language: e.target.value })}
                  >
                    {LANGUAGES.map(lang => (
                      <MenuItem key={lang} value={lang}>
                        {lang.replace('_', '/').toUpperCase()}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl fullWidth sx={{ mb: 3 }}>
                  <InputLabel>Theme</InputLabel>
                  <Select
                    value={documentSettings.theme}
                    label="Theme"
                    onChange={(e) => setDocumentSettings({ ...documentSettings, theme: e.target.value })}
                  >
                    {THEMES.map(theme => (
                      <MenuItem key={theme} value={theme}>
                        {theme.charAt(0).toUpperCase() + theme.slice(1)}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <Button
                  fullWidth
                  variant="contained"
                  onClick={handleNewDocument}
                  sx={{
                    background: `linear-gradient(45deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                  }}
                >
                  Create Document
                </Button>
              </Paper>
            </Modal>

            {/* Main Content */}
            <Box textAlign="center" mb={6}>
              <Typography variant="h3" gutterBottom sx={{
                fontWeight: 700,
                color: theme.palette.primary.main,
                mb: 2
              }}>
                Collab<span style={{ color: theme.palette.secondary.main }}>Flow</span>
              </Typography>
              <Typography variant="h6" color="text.secondary" sx={{ mb: 4 }}>
                Create, collaborate, and conquer documents in real-time
              </Typography>

              <motion.div whileHover={{ scale: 1.05 }}>
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<Description />}
                  onClick={() => setModalOpen(true)}
                  sx={{
                    px: 6,
                    py: 2,
                    borderRadius: 50,
                    fontSize: '1.1rem',
                    background: `linear-gradient(45deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                    '&:hover': {
                      transform: 'scale(1.05)'
                    }
                  }}
                >
                  Start New Document
                </Button>
              </motion.div>
            </Box>

            <Grid container spacing={4} sx={{ mt: 4 }}>
              <Grid item xs={12} md={6}>
                <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
                  Why CollabFlow?
                </Typography>
                <List>
                  {features.map((feature, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <ListItem sx={{ px: 0 }}>
                        <ListItemIcon>
                          <Avatar sx={{
                            bgcolor: theme.palette.primary.light,
                            color: theme.palette.primary.contrastText
                          }}>
                            {feature.icon}
                          </Avatar>
                        </ListItemIcon>
                        <ListItemText
                          primary={feature.text}
                          primaryTypographyProps={{
                            variant: 'body1',
                            fontWeight: 500
                          }}
                        />
                      </ListItem>
                    </motion.div>
                  ))}
                </List>
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
                  Quick Start Guide
                </Typography>
                <Box component="ol" sx={{
                  pl: 2,
                  '& li': {
                    mb: 2,
                    '&::marker': {
                      color: theme.palette.primary.main,
                      fontWeight: 500
                    }
                  }
                }}>
                  <li>Click "New Document" to create a workspace</li>
                  <li>Invite collaborators via share button</li>
                  <li>Use the rich toolbar for formatting</li>
                  <li>Changes save automatically to cloud</li>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </motion.div>
      </Container>
    </Box>
  );
};

export default Home;