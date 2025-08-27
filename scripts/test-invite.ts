#!/usr/bin/env tsx

/**
 * Test script for the invite email system
 * Usage: npm run test:invite
 * 
 * This script tests the email sending functionality with different drivers
 * and validates the email payload without actually sending emails.
 */

import { MailerFactory } from '../src/lib/mailer/mailer-factory';
import { Logger } from '../src/lib/logger';

async function testInviteEmail() {
  console.log('🧪 Testing Invite Email System\n');

  // Test environment validation
  console.log('1. Validating environment...');
  const validation = MailerFactory.validateEnvironment();
  if (!validation.isValid) {
    console.error('❌ Environment validation failed:');
    validation.errors.forEach(error => console.error(`   - ${error}`));
    return;
  }
  console.log('✅ Environment validation passed\n');

  // Test mailer creation
  console.log('2. Creating mailer...');
  try {
    const mailer = MailerFactory.createMailer();
    console.log(`✅ Mailer created successfully (${mailer.constructor.name})\n`);
  } catch (error) {
    console.error('❌ Failed to create mailer:', error);
    return;
  }

  // Test email sending
  console.log('3. Testing email sending...');
  const testParams = {
    email: 'test@example.com',
    fullName: 'Test User',
    role: 'Manager',
    tenantName: 'Test Company',
    verificationUrl: 'https://example.com/verify?token=test123',
    invitationBaseUrl: 'https://test.vibenet.shop',
    isReinvite: false
  };

  try {
    const mailer = MailerFactory.createMailer();
    const result = await mailer.sendInvite(testParams);

    if (result.success) {
      console.log('✅ Email sent successfully');
      console.log(`   Email ID: ${result.emailId}`);
      console.log(`   Recipient: ${testParams.email}`);
      console.log(`   Role: ${testParams.role}`);
      console.log(`   Tenant: ${testParams.tenantName}`);
    } else {
      console.error('❌ Email sending failed:');
      console.error(`   Error: ${result.error?.message}`);
      console.error(`   Code: ${result.error?.code}`);
      if (result.error?.details) {
        console.error(`   Details:`, result.error.details);
      }
    }
  } catch (error) {
    console.error('❌ Unexpected error during email sending:', error);
  }

  console.log('\n4. Testing re-invite scenario...');
  try {
    const mailer = MailerFactory.createMailer();
    const reinviteResult = await mailer.sendInvite({
      ...testParams,
      isReinvite: true
    });

    if (reinviteResult.success) {
      console.log('✅ Re-invite email sent successfully');
      console.log(`   Email ID: ${reinviteResult.emailId}`);
    } else {
      console.error('❌ Re-invite email failed:', reinviteResult.error?.message);
    }
  } catch (error) {
    console.error('❌ Unexpected error during re-invite:', error);
  }

  console.log('\n5. Testing invalid email...');
  try {
    const mailer = MailerFactory.createMailer();
    const invalidResult = await mailer.sendInvite({
      ...testParams,
      email: 'invalid-email'
    });

    if (!invalidResult.success) {
      console.log('✅ Invalid email correctly rejected');
      console.log(`   Error: ${invalidResult.error?.message}`);
    } else {
      console.warn('⚠️ Invalid email was not rejected');
    }
  } catch (error) {
    console.error('❌ Unexpected error during invalid email test:', error);
  }

  console.log('\n🎉 Email system test completed!');
  console.log('\nTo test with real emails:');
  console.log('1. Set EMAIL_DRIVER=RESEND in your .env file');
  console.log('2. Configure RESEND_API_KEY and RESEND_FROM');
  console.log('3. Update the test email address above');
  console.log('4. Run this script again');
}

// Run the test
testInviteEmail().catch(console.error);
