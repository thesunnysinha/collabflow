import React, { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "react-router-dom";
import { io } from "socket.io-client";
import AceEditor from "react-ace";
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
  Tooltip,
  Avatar,
  Chip
} from "@mui/material";
import { Code, Palette, Share, People } from "@mui/icons-material";
import { styled } from "@mui/material/styles";
import { motion } from "framer-motion";
import { SOCKET_URL } from "../config";
import apiClient, { TOKEN_KEY } from "../services/apiService";
import { debounce } from "lodash";
import ShareModal from "./ShareModal";
import { useNavigate } from "react-router-dom";

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
  const navigate = useNavigate();
  const [documentData, setDocumentData] = useState({
    content: "",
    title: "",
    language: 'python',
    theme: 'github'
  });
  const [collaborators, setCollaborators] = useState([]);
  const [shared, setShared] = useState({ isOwner: false, collaborators: [] });
  const [shareOpen, setShareOpen] = useState(false);
  const [notice, setNotice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const debounceRef = useRef();
  const socket = useRef(null);
  if (!socket.current) {
    socket.current = io(SOCKET_URL, {
      autoConnect: false,
      // Function form so a reconnect always sends the current token.
      auth: (cb) => cb({ token: localStorage.getItem(TOKEN_KEY) })
    });
  }

  const fetchDocument = useCallback(async ({ silent = false } = {}) => {
    try {
      if (!silent) setLoading(true);
      const response = await apiClient.get(`/documents/${documentId}`);
      const doc = response.data;
      setDocumentData({
        content: doc.content,
        title: doc.title,
        language: doc.language || 'python',
        theme: doc.theme || 'github'
      });
      setShared({ isOwner: response.meta.isOwner, collaborators: doc.collaborators || [] });
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to load document');
    } finally {
      setLoading(false);
    }
  }, [documentId]);

  useEffect(() => {
    const currentSocket = socket.current;

    // Join on every (re)connect so presence and rooms survive network drops.
    const join = () => currentSocket.emit('join-document', { documentId });
    const onAppError = (msg) => setNotice(msg);
    const onConnectError = (err) => {
      if (err.message === 'Authentication failed') navigate('/login', { replace: true });
    };
    currentSocket.on('connect', join);
    currentSocket.on('app-error', onAppError);
    currentSocket.on('connect_error', onConnectError);
    currentSocket.connect();

    return () => {
      currentSocket.off('connect', join);
      currentSocket.off('app-error', onAppError);
      currentSocket.off('connect_error', onConnectError);
      currentSocket.disconnect();
    };
  }, [documentId, navigate]);

  useEffect(() => {
    const currentSocket = socket.current;
    const handleDocumentUpdate = (update) => {
      // Prevent self-update loops
      if (update.socketId !== currentSocket.id) {
        setDocumentData(prev => ({ ...prev, ...update }));
      }
    };

    const eventName = `document-update-${documentId}`;
    currentSocket.on(eventName, handleDocumentUpdate);

    return () => {
      currentSocket.off(eventName, handleDocumentUpdate);
    };
  }, [documentId]);

  useEffect(() => {
    debounceRef.current = debounce((update) => {
      socket.current.emit("document-update", {
        ...update,
        socketId: socket.current.id
      });
    }, 300);

    return () => debounceRef.current?.cancel();
  }, [documentId]);

  useEffect(() => {
    const currentSocket = socket.current;
    const handleCollaboratorsUpdate = (updatedCollabs) => {
      setCollaborators(updatedCollabs);
    };

    currentSocket.on('collaborators-update', handleCollaboratorsUpdate);
    return () => {
      currentSocket.off('collaborators-update', handleCollaboratorsUpdate);
    };
  }, []);

  const handleChange = useCallback((type, value) => {
    setDocumentData(prev => {
      // Only update if content actually changed
      if (prev[type] === value) return prev;

      const update = { [type]: value };
      debounceRef.current?.(update);
      return { ...prev, ...update };
    });
  }, []);

  useEffect(() => {
    fetchDocument();
  }, [fetchDocument]);

  const renderCollaborators = () => (
    <Box display="flex" alignItems="center" gap={1}>
      <People sx={{ color: 'white', mr: 1 }} />
      {collaborators.map((collab) => (
        <Tooltip key={collab.id} title={collab.name}>
          <Chip
            avatar={<Avatar sx={{ bgcolor: 'primary.light' }}>
              {(collab.name || "?")[0].toUpperCase()}
            </Avatar>}
            label={collab.name}
            variant="outlined"
            sx={{
              color: 'white',
              borderColor: 'rgba(255,255,255,0.3)',
              '& .MuiChip-label': { fontWeight: 500 }
            }}
          />
        </Tooltip>
      ))}
    </Box>
  );

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
          onClick={() => fetchDocument()}
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
      <ShareModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        documentId={documentId}
        isOwner={shared.isOwner}
        collaborators={shared.collaborators}
        onChanged={() => fetchDocument({ silent: true })}
      />
      {notice && <Alert severity="warning" onClose={() => setNotice(null)} sx={{ mb: 1 }}>{notice}</Alert>}

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

          <Box display="flex" alignItems="center" gap={2}>
            {renderCollaborators()}
            <Tooltip title="Share Document">
              <IconButton sx={{ color: "white" }} onClick={() => setShareOpen(true)}>
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
                  {lang.replace('_', '/').toUpperCase()}
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
                  {theme.charAt(0).toUpperCase() + theme.slice(1)}
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