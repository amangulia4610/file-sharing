// Environment configuration for Socket.IO connection
const config = {
  // In production, connect to the same server that serves the app
  // In development, connect to the development server
  SOCKET_URL: import.meta.env.PROD 
    ? window.location.origin 
    : 'http://10.0.0.15:4000'
};

export default config;
