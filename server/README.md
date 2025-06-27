# Render.com Deployment

This server is configured for deployment on Render.com.

## Deployment Steps

1. Connect your GitHub repository to Render.com
2. Create a new Web Service
3. Set Root Directory to `server`
4. Use build command: `npm install`
5. Use start command: `npm start`
6. Set environment variable: `NODE_ENV=production`

## Environment Variables

- `NODE_ENV`: Set to 'production' in Render dashboard
- `PORT`: Automatically provided by Render

## Features

- CORS configured for GitHub Pages domains
- Automatic port binding for Render
- WebSocket support for real-time communication
