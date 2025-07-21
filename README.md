# 🚀 Prompt Enhancer - Chrome Extension

> A "Grammarly for AI prompts" that helps users create better prompts for ChatGPT, Claude, and other AI tools.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YOUR_USERNAME/prompt-enhancer)

## ✨ Features

- 🤖 **AI-Powered Enhancement** - Improve prompts using OpenAI GPT-4
- 🔐 **Secure Authentication** - Clerk-powered sign-up/sign-in
- 🎯 **Multiple Enhancement Types** - Professional, Creative, Engaging, General
- 📱 **Chrome Extension** - Works on any website
- ⚡ **Real-time Processing** - Fast prompt improvements
- 📊 **Usage Analytics** - Track enhancement history

## 🎯 Demo

![Extension Demo](docs/demo.gif)

*Click the extension icon → Sign in → Enhance your prompts instantly*

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Chrome         │    │  Vercel API     │    │  External APIs  │
│  Extension      │───▶│  (Node.js)      │───▶│  • OpenAI       │
│  (Frontend)     │    │  • Auth         │    │  • Clerk        │
│                 │    │  • Enhancement  │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🚀 Quick Start

### 1. Clone & Setup
```bash
git clone https://github.com/YOUR_USERNAME/prompt-enhancer.git
cd prompt-enhancer
```

### 2. Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Add your API keys to .env
npm run dev
```

### 3. Extension Setup
- Load `extension/` folder in Chrome (`chrome://extensions/`)
- Update API URLs in popup.js and background.js
- Test the extension

### 4. Deploy to Production
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YOUR_USERNAME/prompt-enhancer)

## 📋 Environment Variables

### Required API Keys:
```bash
CLERK_SECRET_KEY=sk_test_...          # From clerk.com
CLERK_PUBLISHABLE_KEY=pk_test_...     # From clerk.com  
OPENAI_API_KEY=sk-...                 # From platform.openai.com
ALLOWED_ORIGINS=chrome-extension://... # Your extension ID
```

## 🛠️ Tech Stack

### Frontend (Chrome Extension)
- **Vanilla JavaScript** - No frameworks for fast loading
- **Chrome Extensions API** - Storage, tabs, runtime
- **CSS3** - Responsive design with animations

### Backend (Vercel API)
- **Node.js + Express** - REST API server
- **Clerk** - Authentication & user management
- **OpenAI GPT-4** - AI prompt enhancement
- **Rate Limiting** - Prevent API abuse

### Infrastructure
- **Vercel** - Serverless deployment
- **Chrome Web Store** - Extension distribution

## 📁 Project Structure

```
prompt-enhancer/
├── backend/                 # API server
│   ├── server.js           # Main Express server
│   ├── package.json        # Dependencies
│   ├── vercel.json         # Vercel config
│   └── .env.example        # Environment template
├── extension/              # Chrome extension
│   ├── manifest.json       # Extension config
│   ├── popup.html          # Main UI
│   ├── popup.js            # Frontend logic
│   ├── background.js       # Service worker
│   ├── content.js          # Page scripts
│   └── style.css           # Styles
├── docs/                   # Documentation
└── README.md               # This file
```

## 🔧 Development

### Local Development
```bash
# Start backend
cd backend && npm run dev

# Load extension in Chrome
# 1. Go to chrome://extensions/
# 2. Enable Developer mode
# 3. Load unpacked → select extension/ folder
```

### Testing
```bash
# Test API endpoints
curl http://localhost:3000/api/health
curl -X POST http://localhost:3000/api/enhance \
  -H "Content-Type: application/json" \
  -d '{"prompt":"test","enhancementType":"improve"}'
```

## 🚀 Deployment

### Vercel (Recommended)
1. Connect GitHub repo to Vercel
2. Set root directory to `backend/`
3. Add environment variables
4. Deploy automatically on push

### Manual Deployment
```bash
cd backend
vercel --prod
```

## 🔐 Security

- ✅ No API keys in extension code
- ✅ CORS protection
- ✅ Rate limiting
- ✅ Input validation
- ✅ Secure token storage

## 📊 Usage Analytics

The extension tracks (anonymously):
- Enhancement requests by type
- Success/error rates
- Performance metrics
- User engagement

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📝 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🔗 Links

- [Chrome Web Store](#) (Coming soon)
- [API Documentation](docs/api.md)
- [Contributing Guide](docs/contributing.md)
- [Changelog](docs/changelog.md)

## 💬 Support

- 🐛 [Report Issues](https://github.com/YOUR_USERNAME/prompt-enhancer/issues)
- 💡 [Feature Requests](https://github.com/YOUR_USERNAME/prompt-enhancer/discussions)
- 📧 [Email Support](mailto:support@yourapp.com)

---

<p align="center">
  Made with ❤️ for better AI interactions
</p>
