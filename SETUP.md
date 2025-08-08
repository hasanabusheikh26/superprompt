# SuperPrompt Setup Guide

## 🔑 OpenAI API Key Setup

### Step 1: Get Your OpenAI API Key

1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)
2. Sign in or create an account
3. Click "Create new secret key"
4. Copy your API key (starts with `sk-`)

### Step 2: Configure the Extension

1. Open `extention/config.js`
2. Replace `'your-openai-api-key-here'` with your actual API key:
   ```javascript
   const CONFIG = {
     OPENAI_API_KEY: 'sk-your-actual-api-key-here',
     // ... rest of config
   };
   ```

### Step 3: Reload the Extension

1. Go to `chrome://extensions/`
2. Find SuperPrompt extension
3. Click the refresh/reload button
4. Test the extension

## 🚀 Features

- **Real OpenAI Enhancement** - Uses GPT-3.5-turbo for professional enhancement
- **Smart Fallback** - Falls back to local enhancement if API fails
- **Privacy Focused** - API key stays in your browser
- **Universal Compatibility** - Works on all sites

## 💰 Cost

- OpenAI charges per token used
- GPT-3.5-turbo is very affordable (~$0.002 per 1K tokens)
- Typical enhancement uses ~200-500 tokens
- Cost per enhancement: ~$0.0004-$0.001

## 🔒 Security

- API key is stored locally in your browser
- No data is sent to external servers except OpenAI
- Extension only makes API calls when you enhance text

## 🐛 Troubleshooting

### API Key Not Working
- Check that your API key is correct
- Ensure you have credits in your OpenAI account
- Try the extension on a simple text first

### API Errors
- Check console for specific error messages
- Extension will fallback to local enhancement
- Verify your OpenAI account status

### No Enhancement
- Check that you've reloaded the extension
- Verify the config.js file is being loaded
- Look for console errors in Developer Tools

## 📞 Support

If you encounter issues:
1. Check the browser console for errors
2. Verify your OpenAI API key is correct
3. Ensure you have OpenAI credits
4. Try the fallback local enhancement

---

**SuperPrompt** - Professional text enhancement with real AI! 🎉 