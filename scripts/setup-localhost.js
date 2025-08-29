#!/usr/bin/env node

import { execSync, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 Setting up localhost environment...');

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

// Check if we're in a git repository
function checkGitRepo() {
  try {
    execSync('git rev-parse --git-dir', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

// Get git status
function getGitStatus() {
  try {
    const status = execSync('git status --porcelain', { encoding: 'utf8' });
    return status.trim().split('\n').filter(line => line);
  } catch {
    return [];
  }
}

// Check for common issues
function checkCommonIssues() {
  log('🔍 Checking for common issues...', 'blue');
  
  const issues = [];
  
  // Check if package.json exists
  if (!fs.existsSync('package.json')) {
    issues.push('Missing package.json');
  }
  
  // Check if node_modules exists
  if (!fs.existsSync('node_modules')) {
    issues.push('Missing node_modules');
  }
  
  // Check if .env files exist
  const envFiles = ['.env', '.env.local', '.env.development'];
  const missingEnvFiles = envFiles.filter(file => !fs.existsSync(file));
  if (missingEnvFiles.length > 0) {
    issues.push(`Missing environment files: ${missingEnvFiles.join(', ')}`);
  }
  
  // Check TypeScript configuration
  if (!fs.existsSync('tsconfig.json')) {
    issues.push('Missing TypeScript configuration');
  }
  
  return issues;
}

// Fix common issues
async function fixCommonIssues(issues) {
  log('🔧 Fixing common issues...', 'yellow');
  
  for (const issue of issues) {
    log(`Fixing: ${issue}`, 'cyan');
    
    if (issue === 'Missing node_modules') {
      try {
        log('Installing dependencies...', 'blue');
        execSync('npm install', { stdio: 'inherit' });
        log('✅ Dependencies installed', 'green');
      } catch (error) {
        log(`❌ Failed to install dependencies: ${error.message}`, 'red');
      }
    }
    
    if (issue.includes('Missing environment files')) {
      log('Creating .env.local template...', 'blue');
      const envTemplate = `# Local development environment variables
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
VITE_APP_ENV=development
`;
      fs.writeFileSync('.env.local', envTemplate);
      log('✅ Created .env.local template', 'green');
    }
  }
}

// Check and kill conflicting processes
function killConflictingProcesses() {
  log('🔄 Checking for conflicting processes...', 'blue');
  
  const ports = [8080, 3000, 5173, 4173, 8081, 8082, 8083];
  
  for (const port of ports) {
    try {
      if (process.platform === 'win32') {
        const output = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf8' });
        const lines = output.split('\n').filter(line => line.trim());
        
        for (const line of lines) {
          const parts = line.trim().split(/\s+/);
          if (parts.length > 4) {
            const pid = parts[4];
            try {
              execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' });
              log(`✅ Killed process ${pid} on port ${port}`, 'green');
            } catch (e) {
              // Process might already be dead
            }
          }
        }
      } else {
        const output = execSync(`lsof -ti:${port}`, { encoding: 'utf8' });
        const pids = output.trim().split('\n').filter(pid => pid);
        
        for (const pid of pids) {
          try {
            execSync(`kill -9 ${pid}`, { stdio: 'ignore' });
            log(`✅ Killed process ${pid} on port ${port}`, 'green');
          } catch (e) {
            // Process might already be dead
          }
        }
      }
    } catch (e) {
      // Port might not be in use
    }
  }
}

// Clear caches
function clearCaches() {
  log('🧹 Clearing caches...', 'blue');
  
  const cacheDirs = [
    'node_modules/.vite',
    'node_modules/.cache',
    '.vite',
    'dist'
  ];
  
  cacheDirs.forEach(dir => {
    if (fs.existsSync(dir)) {
      try {
        fs.rmSync(dir, { recursive: true, force: true });
        log(`✅ Cleared cache: ${dir}`, 'green');
      } catch (error) {
        log(`⚠️  Could not clear cache: ${dir}`, 'yellow');
      }
    }
  });
}

// Validate configuration files
function validateConfigs() {
  log('✅ Validating configuration files...', 'blue');
  
  // Check Vite config
  if (fs.existsSync('vite.config.ts')) {
    try {
      const viteConfig = fs.readFileSync('vite.config.ts', 'utf8');
      if (!viteConfig.includes('localhost')) {
        log('⚠️  Vite config might need localhost configuration', 'yellow');
      }
    } catch (error) {
      log('⚠️  Could not read Vite config', 'yellow');
    }
  }
  
  // Check TypeScript config
  if (fs.existsSync('tsconfig.json')) {
    try {
      const tsConfig = JSON.parse(fs.readFileSync('tsconfig.json', 'utf8'));
      if (!tsConfig.compilerOptions?.baseUrl) {
        log('⚠️  TypeScript config might need baseUrl configuration', 'yellow');
      }
    } catch (error) {
      log('⚠️  Could not parse TypeScript config', 'yellow');
    }
  }
}

// Main setup function
async function setupLocalhost() {
  log('🚀 Starting localhost setup...', 'magenta');
  
  // Check if we're in a git repo
  if (checkGitRepo()) {
    log('📦 Git repository detected', 'green');
    const changes = getGitStatus();
    if (changes.length > 0) {
      log(`⚠️  Found ${changes.length} uncommitted changes`, 'yellow');
    }
  }
  
  // Check for common issues
  const issues = checkCommonIssues();
  if (issues.length > 0) {
    log(`Found ${issues.length} issues:`, 'yellow');
    issues.forEach(issue => log(`  - ${issue}`, 'yellow'));
    await fixCommonIssues(issues);
  } else {
    log('✅ No common issues found', 'green');
  }
  
  // Kill conflicting processes
  killConflictingProcesses();
  
  // Clear caches
  clearCaches();
  
  // Validate configurations
  validateConfigs();
  
  log('✅ Localhost setup completed!', 'green');
  log('🚀 You can now run: npm run dev:auto', 'cyan');
}

// Run setup
setupLocalhost().catch(error => {
  log(`❌ Setup failed: ${error.message}`, 'red');
  process.exit(1);
});
