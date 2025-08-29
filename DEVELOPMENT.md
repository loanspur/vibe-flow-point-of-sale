# Development Setup Guide

This guide will help you set up and run the vibePOS development environment automatically, avoiding common issues that occur after git pulls.

## Quick Start

### For Windows Users (PowerShell)
```powershell
# Run the automated setup script
.\scripts\dev-setup.ps1

# Or with clean cache
.\scripts\dev-setup.ps1 -Clean
```

### For All Platforms (Node.js)
```bash
# Run the automated setup script
npm run dev:setup

# Or with clean setup
npm run dev:clean
```

### First Time Setup (Supabase Configuration)
If you're setting up the project for the first time, you'll need to configure Supabase:

```bash
# Interactive Supabase configuration
npm run supabase:config
```

This will guide you through setting up your Supabase environment variables.

## What the Setup Scripts Do

The automated setup scripts handle the following common issues:

### 1. **Port Conflicts**
- Automatically detects if ports 8080, 8081, 3000, 3001, 24678, 24679 are in use
- Kills processes using these ports to free them up
- Finds the next available port if needed

### 2. **Missing Dependencies**
- Checks if `node_modules` exists
- Automatically runs `npm install` if dependencies are missing
- Installs missing packages like `tsx` that might be required

### 3. **TypeScript Errors**
- Runs `npx tsc --noEmit` to check for TypeScript errors
- Attempts to auto-fix linting issues with `npm run lint:fix`
- Provides clear error messages if manual fixes are needed

### 4. **Development Server Configuration**
- Uses enhanced Vite configuration with better error handling
- Configures HMR (Hot Module Replacement) properly
- Enables CORS for development
- Auto-opens browser when server starts

## Manual Setup (if needed)

If you prefer to set up manually or the automated scripts don't work:

### 1. Install Dependencies
```bash
npm install
```

### 2. Check for Port Conflicts
```bash
# Windows (PowerShell)
netstat -ano | findstr :8080

# macOS/Linux
lsof -i :8080
```

### 3. Kill Processes on Ports (if needed)
```bash
# Windows (PowerShell)
# Find PID first, then:
taskkill /f /pid <PID>

# macOS/Linux
lsof -ti:8080 | xargs kill -9
```

### 4. Start Development Server
```bash
npm run dev
```

## Common Issues and Solutions

### Issue: "Port is already in use"
**Solution:** The setup scripts automatically handle this. If manual intervention is needed:
```bash
# Windows
netstat -ano | findstr :8080
taskkill /f /pid <PID>

# macOS/Linux
lsof -ti:8080 | xargs kill -9
```

### Issue: "Module not found" or missing dependencies
**Solution:** 
```bash
npm install
npm run dev:setup
```

### Issue: TypeScript errors after git pull
**Solution:**
```bash
npm run lint:fix
npm run dev:setup
```

### Issue: HMR (Hot Module Replacement) not working
**Solution:** The enhanced Vite config automatically handles HMR port conflicts.

### Issue: Browser not opening automatically
**Solution:** Check if your browser is set as default, or manually navigate to the URL shown in the terminal.

### Issue: "Failed to construct 'URL': Invalid URL" (Supabase error)
**Solution:** This error occurs when Supabase environment variables are missing or invalid.
```bash
# Run the interactive Supabase configuration
npm run supabase:config

# Or manually create .env.local with your Supabase credentials
# Get your anon key from: https://supabase.com/dashboard/project/qwtybhvdbbkbcelisuek/settings/api
```

### Issue: "net::ERR_NETWORK_CHANGED" or module loading errors
**Solution:** This error occurs when the development server isn't properly serving modules.
```bash
# Run the development server fix script
npm run dev:fix

# Or manually clear caches and restart
rm -rf node_modules/.vite .vite dist
npm run dev
```

## Development Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server (basic) |
| `npm run dev:setup` | Start with automated troubleshooting |
| `npm run dev:clean` | Clean setup with cache clearing |
| `npm run dev:fix` | Fix development server issues |
| `npm run supabase:config` | Configure Supabase environment |
| `npm run lint` | Check for linting errors |
| `npm run lint:fix` | Auto-fix linting errors |
| `npm run build` | Build for production |

## Environment Variables

Create a `.env.local` file in the project root for local development:

```env
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Development Settings
VITE_DEV_MODE=true
VITE_API_URL=http://localhost:8080
```

## Troubleshooting

### If the setup script fails:

1. **Check Node.js version**: Ensure you're using Node.js 18.x or higher
2. **Clear npm cache**: `npm cache clean --force`
3. **Delete node_modules**: `rm -rf node_modules && npm install`
4. **Check file permissions**: Ensure scripts are executable

### If the development server won't start:

1. **Check for TypeScript errors**: `npx tsc --noEmit`
2. **Check for linting errors**: `npm run lint`
3. **Verify Vite configuration**: Check `vite.config.ts`
4. **Check console for specific error messages**

### If HMR is not working:

1. **Check firewall settings**: Ensure ports 24678-24679 are not blocked
2. **Check browser console**: Look for WebSocket connection errors
3. **Try different browser**: Some browsers have stricter security policies

## Performance Tips

1. **Use the setup scripts**: They optimize the development environment
2. **Keep dependencies updated**: Run `npm update` periodically
3. **Use the enhanced Vite config**: It includes performance optimizations
4. **Monitor memory usage**: Restart the dev server if it becomes slow

## Contributing

When contributing to the project:

1. Always run `npm run dev:setup` after pulling changes
2. Fix any TypeScript errors before committing
3. Run `npm run lint:fix` to ensure code quality
4. Test your changes thoroughly

## Support

If you encounter issues not covered in this guide:

1. Check the console output for specific error messages
2. Review the Vite configuration in `vite.config.ts`
3. Check the package.json for script definitions
4. Create an issue with detailed error information
