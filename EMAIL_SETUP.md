# Email Setup Guide

This guide explains how to configure the email system for user invitations in VibePOS.

## Overview

The email system supports multiple drivers for sending invitation emails:
- **Resend** (Production) - Uses Resend API for reliable email delivery
- **Console** (Development) - Logs emails to console for testing
- **Supabase** (Future) - Uses Supabase's built-in email service

## Environment Variables

### Required for Resend (Production)

```bash
# Resend Configuration
VITE_RESEND_API_KEY=your_resend_api_key_here
VITE_RESEND_FROM=noreply@yourdomain.com
VITE_RESEND_FROM_NAME=VibePOS Team

# Email Driver (optional, defaults to RESEND in production)
VITE_EMAIL_DRIVER=RESEND
```

### For Development/Testing

```bash
# Use console mailer for development
VITE_EMAIL_DRIVER=CONSOLE
```

## Resend Setup

### 1. Create Resend Account
1. Go to [resend.com](https://resend.com)
2. Sign up for a free account
3. Verify your email address

### 2. Get API Key
1. Navigate to the API Keys section
2. Create a new API key
3. Copy the key (starts with `re_`)

### 3. Verify Domain
1. Go to Domains section
2. Add your domain (e.g., `yourdomain.com`)
3. Follow the DNS verification steps
4. Wait for verification to complete

### 4. Configure Environment
Add to your `.env` file:
```bash
VITE_RESEND_API_KEY=re_your_api_key_here
VITE_RESEND_FROM=noreply@yourdomain.com
VITE_RESEND_FROM_NAME=VibePOS Team
```

## Testing

### Run Email Test
```bash
npm run test:invite
```

This will:
- Validate your environment configuration
- Test email sending with the configured driver
- Show detailed error messages if something fails

### Test in Development
1. Set `VITE_EMAIL_DRIVER=CONSOLE` in your `.env`
2. Send an invitation from the UI
3. Check the browser console for the email payload

### Test in Production
1. Set `VITE_EMAIL_DRIVER=RESEND` in your `.env`
2. Configure your Resend API key and verified domain
3. Send an invitation from the UI
4. Check the recipient's email

## Error Handling

The system includes comprehensive error handling:

### Common Resend Errors
- **403 - Domain not verified**: Verify your domain in Resend
- **422 - Invalid email**: Check email format
- **429 - Rate limit exceeded**: Wait and retry
- **500+ - Server error**: Check Resend status

### Error Recovery
- Automatic retries for transient errors (429, 5xx)
- Graceful fallback to console mailer if Resend fails
- Detailed error messages in UI with copy functionality
- Structured logging for debugging

## Troubleshooting

### Email Not Sending
1. Check environment variables are set correctly
2. Verify Resend API key is valid
3. Ensure domain is verified in Resend
4. Check browser console for error messages

### Invalid Email Format
- Ensure email follows RFC5322 format
- Check for typos in email address
- Verify domain exists

### Rate Limiting
- Resend has rate limits based on your plan
- System automatically retries with exponential backoff
- Consider upgrading plan for higher limits

## Security Notes

- Never commit API keys to version control
- Use environment variables for all sensitive data
- Verify sender domains to prevent spoofing
- Monitor email delivery rates and bounces

## Monitoring

### Logs
- All email operations are logged with structured data
- Request IDs for tracking
- Error details for debugging
- No sensitive data in logs

### Metrics
- Email delivery success/failure rates
- Response times
- Error types and frequencies

## Support

If you encounter issues:
1. Check the error messages in the UI
2. Review browser console logs
3. Run the test script: `npm run test:invite`
4. Check Resend dashboard for delivery status
5. Contact support with error details
