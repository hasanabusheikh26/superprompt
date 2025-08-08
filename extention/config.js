// SuperPrompt Configuration
// Replace 'your-openai-api-key-here' with your actual OpenAI API key
// Get your API key from: https://platform.openai.com/api-keys

const CONFIG = {
  OPENAI_API_KEY: 'your-openai-api-key-here', // Replace with your actual API key
  OPENAI_MODEL: 'gpt-3.5-turbo',
  MAX_TOKENS: 1000,
  TEMPERATURE: 0.7
};

// Export for use in content.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
} 