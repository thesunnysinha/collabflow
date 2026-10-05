// Dev-server only: mirrors the production edge proxy so the app can use same-origin URLs.
const { createProxyMiddleware } = require('http-proxy-middleware');

const target = process.env.DEV_BACKEND_URL || 'http://backend:8000';

module.exports = (app) => {
  app.use('/api', createProxyMiddleware({ target, changeOrigin: true }));
  app.use('/socket.io', createProxyMiddleware({ target, changeOrigin: true, ws: true }));
};
