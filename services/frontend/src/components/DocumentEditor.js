import React, { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "react-router-dom";
import { io } from "socket.io-client";
import AceEditor from "react-ace";
import axios from "axios";
import {
  Typography,
  Container,
  Paper,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  Button,
  IconButton,
  Tooltip
} from "@mui/material";
import {
  Code,
  Palette,
  Share,
  Settings
} from "@mui/icons-material";
import { styled } from "@mui/material/styles";
import { motion } from "framer-motion";
import { API_BASE_URL, BASE_URL } from "../config";
import { debounce } from "lodash";

// Supported languages and themes
const LANGUAGES = [
  'java', 'python', 'javascript', 'typescript', 'html', 'css', 'c_cpp', 'ruby'
];
const THEMES = ['github', 'monokai', 'tomorrow', 'twilight'];

// Preload editor resources
LANGUAGES.forEach(lang => {
  try {
    require(`ace-builds/src-noconflict/mode-${lang}`);
    require(`ace-builds/src-noconflict/snippets/${lang}`);
  } catch (e) {
    console.warn(`Language ${lang} not available`);
  }
});

THEMES.forEach(theme => {
  require(`ace-builds/src-noconflict/theme-${theme}`);
});

// Styled components
const GradientHeader = styled(Box)(({ theme }) => ({
  background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
  borderRadius: "16px",
  padding: theme.spacing(2),
  marginBottom: theme.spacing(2),
  boxShadow: theme.shadows[4],
}));

const StyledSelect = styled(Select)(({ theme }) => ({
  borderRadius: "12px",
  "& .MuiOutlinedInput-notchedOutline": {
    borderColor: theme.palette.divider,
  },
  "&:hover .MuiOutlinedInput-notchedOutline": {
    borderColor: theme.palette.primary.main,
  },
}));

function DocumentEditor() {
  const { id: documentId } = useParams();
  const [documentData, setDocumentData] = useState({
    content: "",
    title: "",
    language: 'python',
    theme: 'github'
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const debounceRef = useRef();
  const socket = useRef(io(BASE_URL, { autoConnect: false }));

  // Initialize debounce function
  useEffect(() => {
    debounceRef.current = debounce((update) => {
      socket.current.emit("document-update", {
        docId: documentId,
        ...update
      });
    }, 300);

    return () => {
      debounceRef.current?.cancel();
    };
  }, [documentId]);

  // Fetch document data
  const fetchDocument = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/documents/${documentId}`);
      setDocumentData({
        content: response.data.content,
        title: response.data.title,
        language: response.data.language || 'python',
        theme: response.data.theme || 'github'
      });
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load document');
    } finally {
      setLoading(false);
    }
  }, [documentId]);

  // Updated socket.io connection management
  useEffect(() => {
    const currentSocket = socket.current;
    currentSocket.connect();

    return () => {
      currentSocket.disconnect();
    };
  }, []);

  // Updated document synchronization effect
  useEffect(() => {
    const currentSocket = socket.current;
    const handleDocumentUpdate = (update) => {
      setDocumentData(prev => ({ ...prev, ...update }));
    };

    currentSocket.emit("join-document", documentId);
    currentSocket.on(`document-update-${documentId}`, handleDocumentUpdate);

    return () => {
      currentSocket.off(`document-update-${documentId}`, handleDocumentUpdate);
      currentSocket.emit("leave-document", documentId);
    };
  }, [documentId]);



  // Unified change handler
  const handleChange = useCallback((type, value) => {
    const update = { [type]: value };
    setDocumentData(prev => ({ ...prev, ...update }));
    debounceRef.current?.(update);
  }, []);

  // Initial load
  useEffect(() => {
    fetchDocument();
  }, [fetchDocument]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" mt={4}>
        <CircularProgress size={60} />
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button
          variant="contained"
          onClick={fetchDocument}
          sx={{
            background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
            color: 'white'
          }}
        >
          Retry Loading
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{
      display: "flex",
      flexDirection: "column",
      height: "100vh",
      py: 4
    }}>
      <GradientHeader>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <motion.div initial={{ x: -20 }} animate={{ x: 0 }}>
            <Typography variant="h4" noWrap sx={{
              color: "white",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              gap: 1
            }}>
              <Code fontSize="large" />
              {documentData.title || `Untitled-${documentId.slice(0, 5)}`}
            </Typography>
          </motion.div>

          <Box display="flex" gap={1}>
            <Tooltip title="Share Document">
              <IconButton sx={{ color: "white" }}>
                <Share />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </GradientHeader>

      <Paper elevation={0} sx={{
        flex: 1,
        p: 2,
        borderRadius: 4,
        border: "2px solid",
        borderColor: "divider",
        background: "linear-gradient(145deg, rgba(255,255,255,0.95) 0%, rgba(245,245,245,0.95) 100%)",
        overflow: "hidden"
      }}>
        <Box sx={{
          mb: 2,
          display: "flex",
          gap: 2,
          "& > *": {
            flex: 1,
            maxWidth: 300
          }
        }}>
          <FormControl variant="outlined" size="small">
            <InputLabel sx={{ fontWeight: 500 }}>Language</InputLabel>
            <StyledSelect
              value={documentData.language}
              onChange={(e) => handleChange('language', e.target.value)}
              startAdornment={<Code color="action" sx={{ mr: 1 }} />}
            >
              {LANGUAGES.map(lang => (
                <MenuItem key={lang} value={lang}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Palette fontSize="small" />
                    {lang.replace('_', '/').toUpperCase()}
                  </Box>
                </MenuItem>
              ))}
            </StyledSelect>
          </FormControl>

          <FormControl variant="outlined" size="small">
            <InputLabel sx={{ fontWeight: 500 }}>Theme</InputLabel>
            <StyledSelect
              value={documentData.theme}
              onChange={(e) => handleChange('theme', e.target.value)}
              startAdornment={<Palette color="action" sx={{ mr: 1 }} />}
            >
              {THEMES.map(theme => (
                <MenuItem key={theme} value={theme}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Settings fontSize="small" />
                    {theme.charAt(0).toUpperCase() + theme.slice(1)}
                  </Box>
                </MenuItem>
              ))}
            </StyledSelect>
          </FormControl>
        </Box>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <AceEditor
            mode={documentData.language}
            theme={documentData.theme}
            value={documentData.content}
            onChange={(value) => handleChange('content', value)}
            name="code-editor"
            width="100%"
            height="calc(100vh - 220px)"
            fontSize={14}
            showPrintMargin={false}
            editorProps={{ $blockScrolling: true }}
            setOptions={{
              enableBasicAutocompletion: true,
              enableLiveAutocompletion: true,
              enableSnippets: true,
              tabSize: 2,
              showLineNumbers: true,
              showGutter: true
            }}
            style={{
              borderRadius: "12px",
              border: "1px solid",
              borderColor: "divider"
            }}
          />
        </motion.div>
      </Paper>
    </Container>
  );
}

export default DocumentEditor;