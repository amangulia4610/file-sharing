# 🚀 Server Deployment Guide

## Step 1: Deploy to GitHub

First, let's get your code on GitHub:

### 1.1 Initialize Git Repository (if not already done)

```bash
cd /Users/amangulia/Downloads/CODE/file-share/file-sharing
git init
git add .
git commit -m "Initial commit - File sharing app"
```

### 1.2 Create GitHub Repository

1. Go to [GitHub.com](https://github.com)
2. Click "New repository"
3. Name it `file-sharing` (or any name you prefer)
4. **Don't** initialize with README (since you already have files)
5. Click "Create repository"

### 1.3 Push to GitHub

```bash
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git branch -M main
git push -u origin main
```

## Step 2: Deploy Server to Heroku

### 2.1 Heroku Setup (Free Option)

Since Heroku requires payment verification for new apps, let's use **Render.com** instead (completely free):

1. **Go to [Render.com](https://render.com)**
2. **Sign up** with your GitHub account
3. **Click "New +"** → **"Web Service"**
4. **Connect your GitHub repository**
5. **Configure the service**:
   - **Name**: `file-share-server` (or any name)
   - **Root Directory**: `server`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: `Free`

6. **Add Environment Variable**:
   - **Key**: `NODE_ENV`
   - **Value**: `production`

7. **Click "Create Web Service"**

### 2.2 Get Your Server URL

After deployment, Render will provide a URL like:
`https://file-share-server-xxxx.onrender.com`

**Copy this URL** - you'll need it for the client configuration.

## Step 3: Update Client Configuration

### 3.1 Update config.js

Edit `client/src/config.js`:

```javascript
const config = {
  SOCKET_URL: import.meta.env.PROD 
    ? 'https://your-render-url.onrender.com'  // Replace with your actual Render URL
    : 'http://10.0.0.15:4000'
};

export default config;
```

### 3.2 Update vite.config.js

Make sure your repository name is correct in `client/vite.config.js`:

```javascript
base: process.env.NODE_ENV === 'production' ? '/YOUR_REPO_NAME/' : '/',
```

## Step 4: Deploy Client to GitHub Pages

### 4.1 Install Dependencies and Deploy

```bash
cd client
npm install
npm run deploy
```

### 4.2 Enable GitHub Pages

1. Go to your GitHub repository
2. Click **Settings** → **Pages**
3. **Source**: "Deploy from a branch"
4. **Branch**: `gh-pages`
5. **Folder**: `/ (root)`
6. Click **Save**

## Step 5: Access Your App

Your app will be available at:
`https://YOUR_USERNAME.github.io/YOUR_REPO_NAME/`

## Troubleshooting

### Common Issues:

1. **Server not starting**: Check Render logs for errors
2. **CORS errors**: Server is configured to allow GitHub Pages domains
3. **Client not connecting**: Verify server URL in config.js
4. **404 on GitHub Pages**: Check base path in vite.config.js

### Testing Checklist:

✅ Server URL returns a response  
✅ Client loads on GitHub Pages  
✅ QR code generates successfully  
✅ File transfer works between devices  

## Free Deployment Summary

- **Server**: Render.com (Free tier)
- **Client**: GitHub Pages (Free)
- **Total Cost**: $0 🎉

## Commands Summary

```bash
# 1. Push to GitHub
git add .
git commit -m "Ready for deployment"
git push origin main

# 2. Deploy client to GitHub Pages
cd client
npm run deploy

# 3. Server deployment on Render (via web interface)
# 4. Update client config with server URL
# 5. Redeploy client with updated config
```

🎉 **You're all set!** Your file-sharing app is now deployed and accessible worldwide!
