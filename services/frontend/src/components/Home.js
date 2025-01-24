import React from 'react';
import { Button, Typography, Container, Box, Paper } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import apiClient from '../services/apiService';

const Home = () => {
    const navigate = useNavigate();

    const handleNewDocument = async () => {
        try {
            // Create a new document via API
            const response = await apiClient.post('/documents', {
                title: 'New Document',
                content: '',
            });
            // Navigate to the new document's editor
            navigate(`/document/${response.data._id}`);
        } catch (error) {
            console.error('Error creating new document:', error);
        }
    };

    return (
        <Container maxWidth="md" style={{ marginTop: '50px' }}>
            <Paper elevation={3} style={{ padding: '20px' }}>
                <Typography variant="h4" gutterBottom align="center">
                    Welcome to the Collaborative Document Editor
                </Typography>
                <Box mb={2}>
                    <Typography variant="body1" align="center">
                        This platform allows you to collaborate on documents in real-time with others.
                    </Typography>
                </Box>
                <Box display="flex" justifyContent="center" mb={3}>
                    <Button variant="contained" color="primary" onClick={handleNewDocument}>
                        New Document
                    </Button>
                </Box>
                <Box mt={3}>
                    <Typography variant="h6">Usage Guidelines:</Typography>
                    <Typography variant="body2">
                        - Click "New Document" to create a new collaborative document.<br />
                        - Share the document ID with your collaborators for real-time editing.<br />
                        - Use the toolbar to format text and add content.<br />
                        - Your changes will be saved automatically.<br />
                    </Typography>
                </Box>
            </Paper>
        </Container>
    );
};

export default Home;
