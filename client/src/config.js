// Environment configuration for Socket.IO connection
const config = {
  // Replace this URL with your deployed server URL from Render.com
  SOCKET_URL: import.meta.env.PROD 
    ? 'https://file-sharing-0z11.onrender.com' // Your actual Render server URL
    : 'http://10.0.0.15:4000'
};

export default config;
