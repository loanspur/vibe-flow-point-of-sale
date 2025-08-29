#!/usr/bin/env node

import { execSync, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 Checking dependencies...');

// Common missing dependencies that cause localhost issues
const criticalDeps = [
  'tsx',
  'vite',
  '@vitejs/plugin-react-swc',
  'react',
  'react-dom',
  'typescript',
  '@types/react',
  '@types/react-dom',
  '@types/node'
];

// Check if package.json exists
const packageJsonPath = path.join(process.cwd(), 'package.json');
if (!fs.existsSync(packageJsonPath)) {
  console.error('❌ package.json not found');
  process.exit(1);
}

const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const allDeps = {
  ...(packageJson.dependencies || {}),
  ...(packageJson.devDependencies || {})
};

// Check for missing critical dependencies
const missingDeps = criticalDeps.filter(dep => !allDeps[dep]);

if (missingDeps.length > 0) {
  console.log(`⚠️  Missing critical dependencies: ${missingDeps.join(', ')}`);
  console.log('📦 Installing missing dependencies...');
  
  try {
    execSync(`npm install ${missingDeps.join(' ')}`, { 
      stdio: 'inherit',
      cwd: process.cwd()
    });
    console.log('✅ Missing dependencies installed successfully');
  } catch (error) {
    console.error('❌ Failed to install missing dependencies:', error.message);
    process.exit(1);
  }
} else {
  console.log('✅ All critical dependencies are present');
}

// Check for node_modules
const nodeModulesPath = path.join(process.cwd(), 'node_modules');
if (!fs.existsSync(nodeModulesPath)) {
  console.log('📦 node_modules not found, installing dependencies...');
  try {
    execSync('npm install', { stdio: 'inherit', cwd: process.cwd() });
    console.log('✅ Dependencies installed successfully');
  } catch (error) {
    console.error('❌ Failed to install dependencies:', error.message);
    process.exit(1);
  }
}

// Check for TypeScript configuration
const tsConfigPath = path.join(process.cwd(), 'tsconfig.json');
if (!fs.existsSync(tsConfigPath)) {
  console.log('⚠️  TypeScript configuration not found');
}

console.log('✅ Dependency check completed');
