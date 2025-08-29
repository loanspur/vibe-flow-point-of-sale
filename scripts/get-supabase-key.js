#!/usr/bin/env node

import fs from 'fs';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('🔑 Supabase Configuration Helper');
console.log('================================');
console.log('');
console.log('This script will help you configure your Supabase environment variables.');
console.log('');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
  console.log(`${colors.green}✅ ${message}${colors.reset}`);
}

function logInfo(message) {
  console.log(`${colors.blue}ℹ️  ${message}${colors.reset}`);
}

function logWarning(message) {
  console.log(`${colors.yellow}⚠️  ${message}${colors.reset}`);
}

function logError(message) {
  console.error(`${colors.red}❌ ${message}${colors.reset}`);
}

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function main() {
  logInfo('To get your Supabase anon key:');
  console.log('');
  console.log('1. Go to https://supabase.com/dashboard');
  console.log('2. Select your project (qwtybhvdbbkbcelisuek)');
  console.log('3. Go to Settings > API');
  console.log('4. Copy the "anon public" key');
  console.log('');
  
  const supabaseUrl = await question('Enter your Supabase URL (or press Enter for default): ');
  const supabaseAnonKey = await question('Enter your Supabase anon key: ');
  
  if (!supabaseAnonKey) {
    logError('Supabase anon key is required!');
    rl.close();
    return;
  }
  
  const finalUrl = supabaseUrl || 'https://qwtybhvdbbkbcelisuek.supabase.co';
  
  const envContent = `# Supabase Configuration
VITE_SUPABASE_URL=${finalUrl}
VITE_SUPABASE_ANON_KEY=${supabaseAnonKey}

# Development Settings
VITE_DEV_MODE=true
VITE_API_URL=http://localhost:8080
`;
  
  try {
    fs.writeFileSync('.env.local', envContent);
    logSuccess('Created .env.local file with your Supabase configuration!');
    logInfo('You can now run: npm run dev:setup');
  } catch (error) {
    logError('Failed to create .env.local file');
    logInfo('Please create the file manually with this content:');
    console.log('');
    console.log(envContent);
  }
  
  rl.close();
}

main().catch((error) => {
  logError(`Script failed: ${error.message}`);
  rl.close();
  process.exit(1);
});
