#!/usr/bin/env node

import net from 'net';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 Checking port availability...');

// Function to check if a port is available
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    
    server.listen(port, () => {
      server.once('close', () => {
        resolve(true);
      });
      server.close();
    });
    
    server.on('error', () => {
      resolve(false);
    });
  });
}

// Function to find an available port starting from a given port
async function findAvailablePort(startPort) {
  let port = startPort;
  const maxAttempts = 10;
  
  for (let i = 0; i < maxAttempts; i++) {
    if (await isPortAvailable(port)) {
      return port;
    }
    port++;
  }
  
  throw new Error(`No available ports found in range ${startPort}-${startPort + maxAttempts - 1}`);
}

// Check common development ports
async function checkPorts() {
  const commonPorts = [8080, 3000, 5173, 4173, 8081, 8082, 8083];
  
  console.log('🔍 Checking common development ports...');
  
  for (const port of commonPorts) {
    const available = await isPortAvailable(port);
    if (available) {
      console.log(`✅ Port ${port} is available`);
    } else {
      console.log(`❌ Port ${port} is in use`);
    }
  }
  
  // Find the best available port for Vite
  try {
    const availablePort = await findAvailablePort(8080);
    console.log(`🎯 Recommended port for development: ${availablePort}`);
    
    // Update vite.config.ts if needed
    const viteConfigPath = path.join(process.cwd(), 'vite.config.ts');
    if (fs.existsSync(viteConfigPath)) {
      let viteConfig = fs.readFileSync(viteConfigPath, 'utf8');
      
      // Check if the current port is different from available port
      const portMatch = viteConfig.match(/port:\s*(\d+)/);
      if (portMatch && parseInt(portMatch[1]) !== availablePort) {
        console.log(`🔄 Updating Vite config to use port ${availablePort}`);
        viteConfig = viteConfig.replace(/port:\s*\d+/, `port: ${availablePort}`);
        fs.writeFileSync(viteConfigPath, viteConfig);
        console.log('✅ Vite config updated');
      }
    }
    
    return availablePort;
  } catch (error) {
    console.error('❌ No available ports found:', error.message);
    return null;
  }
}

// Kill processes on common development ports if requested
async function killPortProcesses() {
  const { execSync } = await import('child_process');
  const commonPorts = [8080, 3000, 5173, 4173, 8081, 8082, 8083];
  
  console.log('🔄 Attempting to free up development ports...');
  
  for (const port of commonPorts) {
    try {
      // Windows
      if (process.platform === 'win32') {
        const output = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf8' });
        const lines = output.split('\n').filter(line => line.trim());
        
        for (const line of lines) {
          const parts = line.trim().split(/\s+/);
          if (parts.length > 4) {
            const pid = parts[4];
            try {
              execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' });
              console.log(`✅ Killed process ${pid} on port ${port}`);
            } catch (e) {
              // Process might already be dead
            }
          }
        }
      } else {
        // Unix-like systems
        const output = execSync(`lsof -ti:${port}`, { encoding: 'utf8' });
        const pids = output.trim().split('\n').filter(pid => pid);
        
        for (const pid of pids) {
          try {
            execSync(`kill -9 ${pid}`, { stdio: 'ignore' });
            console.log(`✅ Killed process ${pid} on port ${port}`);
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

// Main execution
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--kill')) {
    await killPortProcesses();
  }
  
  const availablePort = await checkPorts();
  
  if (availablePort) {
    console.log(`✅ Port check completed. Use port ${availablePort} for development.`);
  } else {
    console.log('⚠️  No available ports found. Consider killing existing processes.');
  }
}

main().catch(console.error);
