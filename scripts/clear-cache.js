#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🧹 Clearing caches...');

// Directories to clear
const cacheDirs = [
  'node_modules/.vite',
  'node_modules/.cache',
  '.vite',
  'dist',
  '.next',
  '.nuxt',
  '.cache'
];

// Files to remove
const cacheFiles = [
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  '.eslintcache',
  '.prettiercache'
];

function removeDirectory(dirPath) {
  if (fs.existsSync(dirPath)) {
    try {
      fs.rmSync(dirPath, { recursive: true, force: true });
      console.log(`✅ Removed directory: ${dirPath}`);
    } catch (error) {
      console.log(`⚠️  Could not remove directory: ${dirPath} - ${error.message}`);
    }
  }
}

function removeFile(filePath) {
  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
      console.log(`✅ Removed file: ${filePath}`);
    } catch (error) {
      console.log(`⚠️  Could not remove file: ${filePath} - ${error.message}`);
    }
  }
}

// Clear npm cache
function clearNpmCache() {
  try {
    console.log('🧹 Clearing npm cache...');
    execSync('npm cache clean --force', { stdio: 'inherit' });
    console.log('✅ npm cache cleared');
  } catch (error) {
    console.log('⚠️  Could not clear npm cache:', error.message);
  }
}

// Clear browser cache hints
function clearBrowserCacheHints() {
  const cacheBusterFile = path.join(process.cwd(), '.cache-buster');
  try {
    const timestamp = Date.now();
    fs.writeFileSync(cacheBusterFile, timestamp.toString());
    console.log('✅ Browser cache buster updated');
  } catch (error) {
    console.log('⚠️  Could not update cache buster:', error.message);
  }
}

// Main execution
function main() {
  const args = process.argv.slice(2);
  const isForce = args.includes('--force');
  
  console.log('🧹 Starting cache cleanup...');
  
  // Clear directories
  cacheDirs.forEach(dir => {
    const fullPath = path.join(process.cwd(), dir);
    removeDirectory(fullPath);
  });
  
  // Clear files
  cacheFiles.forEach(file => {
    const fullPath = path.join(process.cwd(), file);
    removeFile(fullPath);
  });
  
  // Clear npm cache
  clearNpmCache();
  
  // Update browser cache buster
  clearBrowserCacheHints();
  
  // Reinstall dependencies if --force is used
  if (isForce) {
    console.log('🔄 Force reinstalling dependencies...');
    try {
      removeDirectory(path.join(process.cwd(), 'node_modules'));
      execSync('npm install', { stdio: 'inherit' });
      console.log('✅ Dependencies reinstalled');
    } catch (error) {
      console.log('⚠️  Could not reinstall dependencies:', error.message);
    }
  }
  
  console.log('✅ Cache cleanup completed');
}

main();
