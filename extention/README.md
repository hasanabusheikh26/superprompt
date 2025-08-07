# SuperPrompt Extension

A Chrome extension that enhances text prompts using AI. Select any text on any webpage and get AI-powered improvements.

## Features

- **Text Selection**: Select any text on any webpage
- **AI Enhancement**: Get improved versions of your text using AI
- **Preset Instructions**: Choose from predefined enhancement styles
- **Custom Instructions**: Add your own enhancement instructions
- **In-page Replacement**: Replace the original text with the enhanced version

## Installation

1. **Download the Extension**:
   - Download the `extention.zip` file
   - Extract it to a folder on your computer

2. **Load in Chrome**:
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked"
   - Select the extracted extension folder

3. **Verify Installation**:
   - You should see "SuperPrompt" in your extensions list
   - The extension icon should appear in your toolbar

## How to Use

1. **Select Text**: Highlight any text on any webpage
2. **Click Icon**: Click the SuperPrompt icon that appears
3. **Add Instruction**: 
   - Type your own instruction (e.g., "make it formal", "add examples")
   - Or choose a preset button
4. **Enhance**: Click "Superprompt it" to get the AI-enhanced version
5. **Replace**: Click "Replace in page" to replace the original text

## Preset Instructions

- **Step-by-step guide**: Converts text into numbered steps
- **Clear and concise**: Makes text shorter and more direct
- **Make it friendly**: Rewrites in a warm, approachable tone
- **Detailed explanation**: Adds comprehensive details and examples
- **Simple language**: Rewrites using basic, easy-to-understand words

## Technical Details

- **Backend API**: Uses the deployed backend at `superprompt-nwhqu7jm8-hass-projects-b72778ab.vercel.app`
- **No Authentication Required**: Works immediately without login
- **Cross-origin**: Works on any website
- **Local Storage**: Saves your preferences locally

## Troubleshooting

- **Icon doesn't appear**: Make sure you've selected text and the extension is enabled
- **API errors**: Check your internet connection
- **Extension not loading**: Make sure you're in developer mode and the folder path is correct

## Development

The extension consists of:
- `content.js`: Main functionality for text selection and enhancement
- `auth.js`: Authentication system (currently disabled)
- `prompts.js`: Prompt library system (currently disabled)
- `styles.css`: Styling for the popup interface
- `manifest.json`: Extension configuration

## Backend API

The extension connects to a Node.js backend that provides:
- `POST /api/enhance`: Text enhancement endpoint
- `GET /api/health`: Health check endpoint

The backend uses OpenAI's API for text enhancement and includes fallback rules-based enhancement. 