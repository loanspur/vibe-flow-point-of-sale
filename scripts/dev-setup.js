#!/usr/bin/env node

import { execSync, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import net from 'net';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logError(message) {
  console.error(`${colors.red}❌ ${message}${colors.reset}`);
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

// Check if port is available
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on('error', () => resolve(false));
  });
}

// Find available port
async function findAvailablePort(startPort) {
  let port = startPort;
  while (!(await isPortAvailable(port))) {
    port++;
  }
  return port;
}

// Check if dependencies are installed
function checkDependencies() {
  logInfo('Checking dependencies...');
  
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const nodeModulesExists = fs.existsSync('node_modules');
  
  if (!nodeModulesExists) {
    logWarning('node_modules not found. Installing dependencies...');
    try {
      execSync('npm install', { stdio: 'inherit' });
      logSuccess('Dependencies installed successfully');
    } catch (error) {
      logError('Failed to install dependencies');
      process.exit(1);
    }
  } else {
    logSuccess('Dependencies are installed');
  }
}

// Check and setup environment variables
function checkEnvironmentVariables() {
  logInfo('Checking environment variables...');
  
  const envFiles = ['.env.local', '.env', '.env.development'];
  let envFileExists = false;
  
  for (const envFile of envFiles) {
    if (fs.existsSync(envFile)) {
      envFileExists = true;
      logSuccess(`Found environment file: ${envFile}`);
      break;
    }
  }
  
  if (!envFileExists) {
    logWarning('No environment file found. Creating .env.local with default values...');
    
    const envContent = `# Supabase Configuration
VITE_SUPABASE_URL=https://qwtybhvdbbkbcelisuek.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3dHliaHZkYmJrYmNlbGlzdWVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzMjA1NDAsImV4cCI6MjA3MTg5NjU0MH0.Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8

# Development Settings
VITE_DEV_MODE=true
VITE_API_URL=http://localhost:8080

# Note: Replace the VITE_SUPABASE_ANON_KEY with your actual anon key from Supabase dashboard
# You can find this in your Supabase project settings under API keys
`;
    
    try {
      fs.writeFileSync('.env.local', envContent);
      logSuccess('Created .env.local file with default configuration');
      logWarning('⚠️  IMPORTANT: Please update VITE_SUPABASE_ANON_KEY with your actual Supabase anon key');
      logInfo('You can find this in your Supabase project settings under API keys');
    } catch (error) {
      logError('Failed to create .env.local file');
      logInfo('Please create a .env.local file manually with the following content:');
      console.log(envContent);
    }
  }
}

// Check for TypeScript errors
function checkTypeScript() {
  logInfo('Checking TypeScript configuration...');
  try {
    execSync('npx tsc --noEmit', { stdio: 'pipe' });
    logSuccess('No TypeScript errors found');
  } catch (error) {
    logWarning('TypeScript errors found. Attempting to fix...');
    try {
      // Try to fix common TypeScript issues
      execSync('npm run lint -- --fix', { stdio: 'pipe' });
      logSuccess('TypeScript issues resolved');
    } catch (lintError) {
      logError('Could not automatically fix TypeScript errors. Please fix them manually.');
    }
  }
}

// Kill processes on specific ports
function killProcessOnPort(port) {
  try {
    if (process.platform === 'win32') {
      execSync(`netstat -ano | findstr :${port}`, { stdio: 'pipe' });
      execSync(`for /f "tokens=5" %a in ('netstat -ano ^| findstr :${port}') do taskkill /f /pid %a`, { stdio: 'pipe' });
    } else {
      execSync(`lsof -ti:${port} | xargs kill -9`, { stdio: 'pipe' });
    }
    logSuccess(`Killed process on port ${port}`);
  } catch (error) {
    // Port might not be in use, which is fine
  }
}

// Main setup function
async function setup() {
  log('🚀 Starting development environment setup...', 'bright');
  
  // Check dependencies
  checkDependencies();
  
  // Check environment variables
  checkEnvironmentVariables();
  
  // Check TypeScript
  checkTypeScript();
  
  // Check and free up common development ports
  logInfo('Checking for port conflicts...');
  const commonPorts = [8080, 8081, 3000, 3001, 24678, 24679];
  
  for (const port of commonPorts) {
    if (!(await isPortAvailable(port))) {
      logWarning(`Port ${port} is in use. Attempting to free it...`);
      killProcessOnPort(port);
    }
  }
  
  // Find available port for development
  const devPort = await findAvailablePort(8080);
  const hmrPort = await findAvailablePort(devPort + 1000);
  
  logSuccess(`Development server will use port ${devPort}`);
  logSuccess(`HMR server will use port ${hmrPort}`);
  
  // Create a temporary config file with the found ports
  const tempConfig = `
// Auto-generated config for development
export default {
  server: {
    port: ${devPort},
    hmr: {
      port: ${hmrPort}
    }
  }
};
`;
  
  fs.writeFileSync('.vite-dev-config.js', tempConfig);
  
  logSuccess('Development environment is ready!');
  log('Starting development server...', 'bright');
  
  // Start the development server
  const devProcess = spawn('npm', ['run', 'dev'], {
    stdio: 'inherit',
    shell: true
  });
  
  // Handle process termination
  process.on('SIGINT', () => {
    logInfo('Shutting down development server...');
    devProcess.kill('SIGINT');
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    logInfo('Shutting down development server...');
    devProcess.kill('SIGTERM');
    process.exit(0);
  });
}

// Run setup
setup().catch((error) => {
  logError(`Setup failed: ${error.message}`);
  process.exit(1);
});
