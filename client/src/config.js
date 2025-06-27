// Environment configuration for Socket.IO connection
const config = {
  // Replace this URL with your deployed server URL from Render.com
  SOCKET_URL: import.meta.env.PROD 
    ? 'https://your-render-server-url.onrender.com' // Replace with your actual server URL
    : 'http://10.0.0.15:4000'
};

export default config;
