#!/bin/bash

# Deployment script for File Sharing App (Render.com + GitHub Pages)

echo "🚀 Starting deployment process..."

# Check if we're in the right directory
if [ ! -f "client/package.json" ] || [ ! -f "server/package.json" ]; then
    echo "❌ Error: Run this from the project root directory"
    exit 1
fi

echo "📦 Building client..."
cd client
npm install
npm run build
cd ..

echo "✅ Build complete!"
echo ""
echo "📝 Next steps:"
echo "1. Push to GitHub: git add . && git commit -m 'Ready for deployment' && git push origin main"
echo "2. Deploy server to Render.com (100% FREE - see DEPLOYMENT_GUIDE.md)"
echo "3. Update client/src/config.js with your Render.com server URL"
echo "4. Deploy client to GitHub Pages: cd client && npm run deploy"
echo ""
echo "📚 Full guide: See DEPLOYMENT_GUIDE.md"
echo "🌐 Your app will be available at: https://YOUR_USERNAME.github.io/YOUR_REPO_NAME/"
echo ""
echo "💡 Why Render.com? No credit card required, 750 free hours/month, auto SSL!"
