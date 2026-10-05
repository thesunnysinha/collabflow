// Same-origin by default: the edge proxy routes /api and /socket.io to the backend.
const API_BASE_URL = process.env.REACT_APP_API_URL || '/api/v1';
// undefined => socket.io connects to the page's own origin.
const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || undefined;

export { API_BASE_URL, SOCKET_URL };
