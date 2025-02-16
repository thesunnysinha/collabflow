import React from 'react';
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
  useTheme
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { Description, Group, Edit, CloudDone } from '@mui/icons-material';
import apiClient from '../services/apiService';
import { motion } from 'framer-motion';

const Home = () => {
  const navigate = useNavigate();
  const theme = useTheme();

  const handleNewDocument = async () => {
    try {
      const response = await apiClient.post('/documents', {
        title: 'New Document',
        content: '',
      });
      navigate(`/document/${response.data._id}`);
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
                  onClick={handleNewDocument}
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