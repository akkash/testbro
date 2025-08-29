// Simple test script for OpenRouter API
const OpenAI = require('openai');

require('dotenv').config();

async function testOpenRouter() {
  console.log('🧪 Testing OpenRouter API connection...\n');
  
  if (!process.env.OPENROUTER_KEY) {
    console.error('❌ OPENROUTER_KEY not found in environment variables');
    return;
  }
  
  console.log('✅ Found OPENROUTER_KEY');
  
  try {
    const openai = new OpenAI({
      apiKey: process.env.OPENROUTER_KEY,
      baseURL: 'https://openrouter.ai/api/v1',
    });
    
    console.log('🔄 Testing API connection...');
    
    const completion = await openai.chat.completions.create({
      model: 'openai/gpt-4',
      messages: [
        {
          role: 'user',
          content: 'Hello! Please respond with a simple greeting and confirm you are working.'
        }
      ],
      max_tokens: 50
    });
    
    console.log('✅ API call successful!');
    console.log('🤖 Response:', completion.choices[0].message.content);
    
    console.log('\n🎉 OpenRouter integration is working correctly!');
    
  } catch (error) {
    console.error('❌ API call failed:', error.message);
    
    if (error.status === 401) {
      console.log('🔑 This looks like an authentication error. Please check your OpenRouter API key.');
    } else if (error.status === 429) {
      console.log('⏱️  Rate limit exceeded. Please try again later.');
    }
  }
}

testOpenRouter();
