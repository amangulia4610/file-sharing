/**
 * ============================================================================
 * The File Share - Configuration File
 * ============================================================================
 * 
 * This file contains environment-specific configuration for the file sharing
 * application. It manages the Socket.IO server URL based on whether the app
 * is running in development or production mode.
 * 
 * ENVIRONMENTS:
 * - Development: Uses local IP address for same-network device testing
 * - Production: Uses deployed Render.com server URL for public access
 * 
 * IMPORTANT SETUP NOTES:
 * - Replace the production URL with your actual deployed server URL
 * - Ensure the development IP matches your local network configuration
 * - All devices must be on the same WiFi network in development mode
 * 
 * Author: File Share Team
 * Last Updated: 2024
 * ============================================================================
 */

/**
 * Application Configuration Object
 * 
 * Contains environment-specific settings for Socket.IO connection.
 * Uses Vite's import.meta.env.PROD to detect production builds.
 */
const config = {
  /**
   * Socket.IO Server URL Configuration
   * 
   * PRODUCTION: Points to deployed server (e.g., Render.com, Heroku, etc.)
   * DEVELOPMENT: Points to local development server on network IP
   * 
   * DEVELOPMENT SETUP:
   * - Update the IP address (10.0.0.15) to match your computer's local IP
   * - Find your IP: Run `ipconfig` (Windows) or `ifconfig` (Mac/Linux)
   * - Ensure all devices are connected to the same WiFi network
   * 
   * PRODUCTION SETUP:
   * - Replace 'file-sharing-0z11.onrender.com' with your deployed server URL
   * - Ensure CORS is properly configured on the server for your domain
   */
  SOCKET_URL: import.meta.env.PROD 
    ? 'https://file-sharing-0z11.onrender.com' // Your actual deployed server URL
    : 'http://10.0.0.15:4000'                  // Local development server IP:PORT
};

// Export configuration for use throughout the application
export default config;
