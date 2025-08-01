# Deployment Guide for DigitalOcean

## Quick Setup Steps

### 1. Connect GitHub Repository
1. Go to your Lovable project settings
2. Click "Connect to GitHub" 
3. Create repository and push your code

### 2. Setup DigitalOcean App Platform
1. Log into DigitalOcean
2. Go to "Apps" in the sidebar
3. Click "Create App"
4. Connect your GitHub repository
5. DigitalOcean will automatically detect the `.do/app.yaml` file

### 3. Configure Environment Variables (Auto-configured)
The `.do/app.yaml` file includes:
- `VITE_SUPABASE_URL`: Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Your Supabase anonymous key

### 4. Deploy
1. Click "Create Resources"
2. Wait for initial deployment (5-10 minutes)
3. Get your app URL (e.g., `your-app-name.ondigitalocean.app`)

## Automatic CI/CD
- Every push to `main` branch triggers automatic deployment
- GitHub Actions runs tests before deployment
- Failed tests prevent deployment

## Custom Domain Setup
1. In DigitalOcean Apps dashboard, go to "Settings" → "Domains"
2. Click "Add Domain"
3. Enter your domain name
4. Follow DNS configuration instructions
5. SSL certificate is automatically provisioned

## Cost Estimate
- Basic plan: $5/month for starter apps
- Scales automatically based on traffic
- Free static site hosting for simple deployments

## Monitoring
- Built-in metrics in DigitalOcean dashboard
- Application logs available
- Performance monitoring included

## Need Help?
1. Check DigitalOcean App Platform documentation
2. Review deployment logs in the dashboard
3. Contact support if needed