# Prompt Enhancer Chrome Extension

A "Grammarly for AI prompts" Chrome extension that helps users enhance their prompts for better AI interactions. Features secure authentication via Clerk and AI-powered prompt improvements.

## 🚀 Features

- **Smart Prompt Enhancement**: Improve prompts with AI assistance
- **Multiple Enhancement Types**: Professional, engaging, creative, and general improvements
- **Secure Authentication**: Clerk-powered sign-up/sign-in
- **Usage Tracking**: Monitor enhancement usage and analytics
- **Chrome Store Ready**: Follows all Chrome extension best practices

## 📁 Project Structure

```
prompt-enhancer/
├── extension/
│   ├── manifest.json
│   ├── popup.html
│   ├── popup.js
│   ├── background.js
│   ├── content.js
│   ├── style.css
│   └── icon.png
├── backend/
│   ├── server.js
│   ├── package.json
│   └── .env.example
└── README.md
```

## 🛠️ Setup Instructions

### 1. Backend API Setup

#### Prerequisites
- Node.js 18+ installed
- OpenAI API key
- Clerk account and API keys

#### Installation
```bash
cd backend
npm install
cp .env.example .env
```

#### Configure Environment Variables
Edit `.env` file with your credentials:

```bash
# Required
CLERK_SECRET_KEY=sk_test_your_clerk_secret_key
CLERK_PUBLISHABLE_KEY=pk_test_your_clerk_publishable_key
OPENAI_API_KEY=sk-your_openai_api_key

# Optional
PORT=3000
NODE_ENV=development
ALLOWED_ORIGINS=chrome-extension://your-extension-id
```

#### Start Development Server
```bash
npm run dev
```

The API will be available at `http://localhost:3000`

#### Deploy to Production
Popular options:
- **Vercel**: `vercel --prod`
- **Railway**: `railway deploy`
- **Heroku**: `git push heroku main`

### 2. Chrome Extension Setup

#### Development Setup
1. Update API endpoints in extension files:
   ```javascript
   // In popup.js and background.js, replace:
   'https://your-api-domain.com'
   // With your actual API URL:
   'https://your-backend.vercel.app'
   ```

2. Update Clerk domain in popup.js:
   ```javascript
   // Replace with your Clerk domain
   const authUrl = 'https://your-app.clerk.accounts.dev/sign-up'
   ```

3. Load extension in Chrome:
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the `extension` folder

#### Production Build
1. Update `manifest.json` with your domain:
   ```json
   {
     "host_permissions": [
       "https://your-backend.vercel.app/*"
     ]
   }
   ```

2. Create a ZIP file of the extension folder
3. Upload to Chrome Web Store

### 3. Clerk Authentication Setup

#### Clerk Dashboard Configuration
1. Create a new Clerk application
2. Configure OAuth providers (Google, GitHub, etc.)
3. Set up redirect URLs:
   - `https://your-backend.vercel.app/auth/callback`
   - `chrome-extension://your-extension-id/popup.html`

#### Update Frontend Auth URLs
In `popup.js`, update Clerk URLs:
```javascript
const authUrl = type === 'signup' 
  ? 'https://your-app.clerk.accounts.dev/sign-up'
  : 'https://your-app.clerk.accounts.dev/sign-in';
```

## 🔧 Development

### Testing the Extension
1. Start the backend: `npm run dev`
2. Load extension in Chrome (developer mode)
3. Click extension icon to test popup
4. Try signing up/in and enhancing prompts

### Key Files to Customize

#### `popup.js`
- Update API endpoints
- Modify enhancement types
- Customize UI behavior

#### `background.js`
- Auth token management
- API communication
- Usage tracking

#### `server.js`
- Add new enhancement types
- Implement usage limits
- Add analytics

## 🚀 Deployment Checklist

### Backend Deployment
- [ ] Environment variables configured
- [ ] Clerk webhook endpoints set up
- [ ] Database connected (if using one)
- [ ] Rate limiting configured
- [ ] Error monitoring set up

### Extension Deployment
- [ ] API endpoints updated to production URLs
- [ ] Clerk auth URLs updated
- [ ] Manifest permissions minimized
- [ ] Icons and assets optimized
- [ ] Privacy policy created
- [ ] Chrome Web Store listing prepared

## 🔒 Security Best Practices

### Extension Security
- ✅ No API keys in extension code
- ✅ Minimal Chrome permissions
- ✅ Secure content security policy
- ✅ Auth token stored in chrome.storage.local

### Backend Security
- ✅ Rate limiting implemented
- ✅ Input validation and sanitization
- ✅ Clerk authentication required
- ✅ CORS properly configured
- ✅ Error messages don't leak sensitive data

## 📊 Analytics & Monitoring

### Usage Tracking
The extension tracks:
- Enhancement requests by type
- User authentication events
- Error rates and types
- Performance metrics

### Monitoring Setup
Consider adding:
- Sentry for error tracking
- LogRocket for user session recording
- Google Analytics for usage patterns
- Custom dashboards for business metrics

## 🔧 Troubleshooting

### Common Issues

#### Extension Not Loading
- Check manifest.json syntax
- Verify all files are in correct locations
- Check Chrome developer console for errors

#### Authentication Not Working
- Verify Clerk keys are correct
- Check CORS configuration
- Ensure auth URLs match Clerk settings

#### API Calls Failing
- Check network tab for API responses
- Verify backend is running and accessible
- Check authentication token in requests

#### Enhancement Not Working
- Verify OpenAI API key is valid
- Check rate limits and usage quotas
- Review server logs for errors

### Debug Mode
Enable debug logging by setting:
```javascript
// In popup.js
const DEBUG = true;
```

## 📝 License

MIT License - see LICENSE file for details

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📞 Support

- Create an issue for bugs or feature requests
- Check existing issues before creating new ones
- Provide detailed reproduction steps for bugs

## 🚀 Roadmap

### Planned Features
- [ ] Batch prompt enhancement
- [ ] Prompt templates library
- [ ] Team collaboration features
- [ ] Advanced analytics dashboard
- [ ] Integration with popular AI platforms
- [ ] Mobile app companion

### Enhancement Ideas
- [ ] Custom enhancement styles
- [ ] Prompt history search
- [ ] Export/import functionality
- [ ] Keyboard shortcuts
- [ ] Dark mode support