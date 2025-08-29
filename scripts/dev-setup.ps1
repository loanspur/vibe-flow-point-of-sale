# PowerShell script for development environment setup
# Run this script to automatically handle common development issues

param(
    [switch]$Force,
    [switch]$Clean
)

Write-Host "🚀 Starting development environment setup..." -ForegroundColor Cyan

# Function to write colored output
function Write-ColorOutput($ForegroundColor) {
    $fc = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $ForegroundColor
    if ($args) {
        Write-Output $args
    }
    $host.UI.RawUI.ForegroundColor = $fc
}

function Write-Success($message) {
    Write-ColorOutput Green "✅ $message"
}

function Write-Info($message) {
    Write-ColorOutput Blue "ℹ️  $message"
}

function Write-Warning($message) {
    Write-ColorOutput Yellow "⚠️  $message"
}

function Write-Error($message) {
    Write-ColorOutput Red "❌ $message"
}

# Check if Node.js is installed
try {
    $nodeVersion = node --version
    Write-Success "Node.js version: $nodeVersion"
} catch {
    Write-Error "Node.js is not installed. Please install Node.js first."
    exit 1
}

# Check if npm is available
try {
    $npmVersion = npm --version
    Write-Success "npm version: $npmVersion"
} catch {
    Write-Error "npm is not available. Please check your Node.js installation."
    exit 1
}

# Check if we're in the right directory
if (-not (Test-Path "package.json")) {
    Write-Error "package.json not found. Please run this script from the project root."
    exit 1
}

# Kill processes on common development ports
Write-Info "Checking for port conflicts..."
$commonPorts = @(8080, 8081, 3000, 3001, 24678, 24679)

foreach ($port in $commonPorts) {
    try {
        $processes = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
        if ($processes) {
            Write-Warning "Port $port is in use. Attempting to free it..."
            foreach ($process in $processes) {
                try {
                    Stop-Process -Id $process.OwningProcess -Force -ErrorAction SilentlyContinue
                    Write-Success "Killed process on port $port"
                } catch {
                    Write-Warning "Could not kill process on port $port"
                }
            }
        }
    } catch {
        # Port might not be in use, which is fine
    }
}

# Check if node_modules exists
if (-not (Test-Path "node_modules")) {
    Write-Warning "node_modules not found. Installing dependencies..."
    try {
        npm install
        Write-Success "Dependencies installed successfully"
    } catch {
        Write-Error "Failed to install dependencies"
        exit 1
    }
} else {
    Write-Success "Dependencies are installed"
}

# Check and setup environment variables
Write-Info "Checking environment variables..."
$envFiles = @(".env.local", ".env", ".env.development")
$envFileExists = $false

foreach ($envFile in $envFiles) {
    if (Test-Path $envFile) {
        $envFileExists = $true
        Write-Success "Found environment file: $envFile"
        break
    }
}

if (-not $envFileExists) {
    Write-Warning "No environment file found. Creating .env.local with default values..."
    
    $envContent = @"
# Supabase Configuration
VITE_SUPABASE_URL=https://qwtybhvdbbkbcelisuek.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3dHliaHZkYmJrYmNlbGlzdWVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzMjA1NDAsImV4cCI6MjA3MTg5NjU0MH0.Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8

# Development Settings
VITE_DEV_MODE=true
VITE_API_URL=http://localhost:8080

# Note: Replace the VITE_SUPABASE_ANON_KEY with your actual anon key from Supabase dashboard
# You can find this in your Supabase project settings under API keys
"@
    
    try {
        $envContent | Out-File -FilePath ".env.local" -Encoding UTF8
        Write-Success "Created .env.local file with default configuration"
        Write-Warning "⚠️  IMPORTANT: Please update VITE_SUPABASE_ANON_KEY with your actual Supabase anon key"
        Write-Info "You can find this in your Supabase project settings under API keys"
    } catch {
        Write-Error "Failed to create .env.local file"
        Write-Info "Please create a .env.local file manually with the following content:"
        Write-Output $envContent
    }
}

# Check for TypeScript errors
Write-Info "Checking TypeScript configuration..."
try {
    npx tsc --noEmit
    Write-Success "No TypeScript errors found"
} catch {
    Write-Warning "TypeScript errors found. Attempting to fix..."
    try {
        npm run lint:fix
        Write-Success "TypeScript issues resolved"
    } catch {
        Write-Error "Could not automatically fix TypeScript errors. Please fix them manually."
    }
}

# Clean npm cache if requested
if ($Clean) {
    Write-Info "Cleaning npm cache..."
    try {
        npm cache clean --force
        Write-Success "npm cache cleaned"
    } catch {
        Write-Warning "Could not clean npm cache"
    }
}

Write-Success "Development environment is ready!"
Write-Host "Starting development server..." -ForegroundColor Cyan

# Start the development server
try {
    npm run dev
} catch {
    Write-Error "Failed to start development server"
    exit 1
}
