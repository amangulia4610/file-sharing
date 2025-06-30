/**
 * ============================================================================
 * The File Share - Main Application Component
 * ============================================================================
 * 
 * This is the root component that manages the routing for the file sharing
 * application. It uses React Router to handle navigation between the sender
 * and receiver modes.
 * 
 * ROUTES:
 * - "/" (root): Sender component - Create sessions and send files
 * - "/receive/:session": Receiver component - Join sessions and receive files
 * 
 * ARCHITECTURE:
 * - Single Page Application (SPA) with client-side routing
 * - Responsive design that works on desktop and mobile devices
 * - Real-time communication via WebRTC and Socket.IO
 * 
 * Author: File Share Team
 * Last Updated: 2024
 * ============================================================================
 */

// React Router components for navigation and routing
import { BrowserRouter, Routes, Route } from 'react-router-dom';

// Main application components
import Sender from './components/Sender';     // File sending interface
import Receiver from './components/Receiver'; // File receiving interface

/**
 * Main App Component
 * 
 * Sets up the routing structure for the entire application.
 * Uses React Router's BrowserRouter for HTML5 history API support.
 * 
 * @returns {JSX.Element} The main application with routing configured
 */
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Home page - Sender interface for creating sessions and sending files */}
        <Route path="/" element={<Sender />} />
        
        {/* Receiver page - Dynamic route that accepts session ID parameter */}
        <Route path="/receive/:session" element={<Receiver />} />
      </Routes>
    </BrowserRouter>
  );
}