import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { io } from "socket.io-client";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import {
  Typography,
  Container,
  Paper,
  Box,
  Button,
  Card,
  CardContent,
  List,
  ListItem,
  Avatar,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import axios from "axios"; // Import Axios for API calls
import CollaboratorModal from "./CollaboratorModal"; // Modal for adding collaborators

const socket = io("http://localhost:5000");

const editorConfig = {
  namespace: "MyEditor",
  onError: (error) => {
    console.error("Lexical Error:", error);
  },
};

function DocumentEditor() {
  const { id: documentId } = useParams(); // Get document ID from the URL
  const [content, setContent] = useState(""); // Document content
  const [contributors, setContributors] = useState([]); // List of collaborators
  const [username, setUsername] = useState(""); // Default username (empty initially)
  const [modalOpen, setModalOpen] = useState(true); // Modal open state
  const [editorType, setEditorType] = useState("rich-text"); // Default editor type

  // Reconnect logic for Socket.IO
  const handleReconnect = () => {
    socket.connect();
    console.log("Reconnected to Socket.IO");
  };

  // Fetch document content and setup Socket.IO listeners
  useEffect(() => {
    const fetchDataAndSetupSocketListeners = async () => {
      try {
        // Fetch document data from the backend API
        const response = await axios.get(`http://localhost:5000/api/documents/${documentId}`);
        setContent(response.data.content); // Set the fetched content

        // Join the document room via Socket.IO
        socket.emit("joinDocument", { docId: documentId, username });

        // Listen for updates to contributors
        socket.on(`contributors-${documentId}`, (names) => {
          setContributors(names);
        });

        // Listen for new collaborators joining
        socket.on("newCollaborator", (name) => {
          if (!contributors.includes(name)) {
            setContributors((prev) => [...prev, name]);
          }
        });
      } catch (error) {
        console.error("Error fetching document:", error);
      }
    };

    fetchDataAndSetupSocketListeners();

    return () => {
      socket.off(`contributors-${documentId}`);
      socket.off("newCollaborator");
    };
  }, [documentId]);

  const handleAddCollaborator = (name) => {
    if (name && !contributors.includes(name)) {
      socket.emit("joinDocument", { docId: documentId, username: name });
      setContributors((prev) => [...prev.filter((user) => user !== "Anonymous"), name]); // Remove "Anonymous" if present
      setUsername(name);

      // Emit an event to notify all clients about the new collaborator
      socket.emit("newCollaborator", name);
    }
    setModalOpen(false); // Close modal after adding collaborator
  };

  return (
    <Container maxWidth="lg" style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      {/* Top Bar */}
      <Box display="flex" justifyContent="space-between" alignItems="center" padding={2} style={{ backgroundColor: "#1976d2", color: "white", borderRadius: "8px", marginBottom: "10px" }}>
        <Typography variant="h5">Collaborative Document Editor - <strong>Doc ID:</strong> {documentId}</Typography>
        <Button variant="contained" color="secondary" onClick={handleReconnect}>
          Reconnect
        </Button>
      </Box>

      {/* Collaborator Modal */}
      <CollaboratorModal open={modalOpen} handleClose={() => setModalOpen(false)} handleAddCollaborator={handleAddCollaborator} />

      {/* Main Content */}
      <Box style={{ display: "flex", flexGrow: 1 }}>
        {/* Left Side: Text Editor */}
        <Paper elevation={3} style={{ flexGrow: 1, padding: "20px", marginRight: "20px", height: '100%', borderRadius: "8px", backgroundColor: "#f9f9f9", overflowY: "auto" }}>
          <LexicalComposer initialConfig={editorConfig}>
            <RichTextPlugin
              contentEditable={<ContentEditable style={{ minHeight: "90%", fontSize: "16px", lineHeight: "1.6", fontFamily: "'Roboto', sans-serif" }} />}
              placeholder={<div style={{ color: "#999" }}>Start typing...</div>}
              ErrorBoundary={LexicalErrorBoundary}
            />
          </LexicalComposer>
        </Paper>

        {/* Right Side: Collaborators */}
        <Box width="300px" padding={2} style={{ overflowY: "auto", height: '100%', borderRadius: "8px", backgroundColor: "#fff", boxShadow: "0px 3px 5px -1px rgba(0,0,0,0.2)" }}>
          <Typography variant="h6" gutterBottom>Collaborators</Typography>

          {/* Editor Type Selection */}
          <FormControl fullWidth variant="outlined" margin="normal">
            <InputLabel id="editor-type-label">Select Editor Type</InputLabel>
            <Select
              labelId="editor-type-label"
              value={editorType}
              onChange={(e) => setEditorType(e.target.value)}
              label="Select Editor Type"
            >
              <MenuItem value="rich-text">Rich Text</MenuItem>
              <MenuItem value="markdown">Markdown</MenuItem>
            </Select>
          </FormControl>

          <List>
            {contributors.map((name, index) => (
              <ListItem key={index} style={{ paddingLeft: 0 }}>
                <Card variant="outlined" style={{ width: '100%', marginBottom: '10px', display: 'flex', alignItems: 'center' }}>
                  <Avatar style={{ marginRight: '10px', backgroundColor: '#1976d2' }}>{name.charAt(0).toUpperCase()}</Avatar>
                  <CardContent style={{ paddingTop: '8px', paddingBottom: '8px' }}>
                    <Typography variant="body1">{name}</Typography>
                  </CardContent>
                </Card>
              </ListItem>
            ))}
          </List>
        </Box>
      </Box>
    </Container>
  );
}

export default DocumentEditor;
