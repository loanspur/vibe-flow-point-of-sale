#!/usr/bin/env node

import { execSync, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

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

// Clear Vite cache and node_modules cache
function clearCaches() {
  logInfo('Clearing development caches...');
  
  const cacheDirs = [
    'node_modules/.vite',
    '.vite',
    'dist',
    '.cache'
  ];
  
  cacheDirs.forEach(dir => {
    if (fs.existsSync(dir)) {
      try {
        fs.rmSync(dir, { recursive: true, force: true });
        logSuccess(`Cleared ${dir}`);
      } catch (error) {
        logWarning(`Could not clear ${dir}: ${error.message}`);
      }
    }
  });
  
  // Clear npm cache
  try {
    execSync('npm cache clean --force', { stdio: 'pipe' });
    logSuccess('Cleared npm cache');
  } catch (error) {
    logWarning('Could not clear npm cache');
  }
}

// Kill any existing development servers
function killDevServers() {
  logInfo('Killing existing development servers...');
  
  const ports = [8080, 8081, 3000, 3001, 24678, 24679];
  
  ports.forEach(port => {
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
  });
}

// Reinstall dependencies if needed
function reinstallDependencies() {
  logInfo('Checking dependencies...');
  
  if (!fs.existsSync('node_modules')) {
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

// Check for TypeScript errors
function checkTypeScript() {
  logInfo('Checking TypeScript configuration...');
  try {
    execSync('npx tsc --noEmit', { stdio: 'pipe' });
    logSuccess('No TypeScript errors found');
  } catch (error) {
    logWarning('TypeScript errors found. Attempting to fix...');
    try {
      execSync('npm run lint:fix', { stdio: 'pipe' });
      logSuccess('TypeScript issues resolved');
    } catch (lintError) {
      logError('Could not automatically fix TypeScript errors. Please fix them manually.');
    }
  }
}

// Main fix function
async function fixDevServer() {
  log('🔧 Fixing development server issues...', 'bright');
  
  // Kill existing servers
  killDevServers();
  
  // Clear caches
  clearCaches();
  
  // Reinstall dependencies if needed
  reinstallDependencies();
  
  // Check TypeScript
  checkTypeScript();
  
  logSuccess('Development server issues fixed!');
  log('Starting development server...', 'bright');
  
  // Start the development server with a clean slate
  const devProcess = spawn('npm', ['run', 'dev'], {
    stdio: 'inherit',
    shell: true,
    env: {
      ...process.env,
      NODE_ENV: 'development',
      VITE_CLEAR_CACHE: 'true'
    }
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

// Run fix
fixDevServer().catch((error) => {
  logError(`Fix failed: ${error.message}`);
  process.exit(1);
});
