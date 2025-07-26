import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
  Section,
  Button,
} from 'npm:@react-email/components@0.0.22';
import * as React from 'npm:react@18.3.1';

interface TrialEncouragementEmailProps {
  userName: string;
  tenantName: string;
  trialEndsAt: string;
  upgradeUrl: string;
  encouragementType: 'early' | 'mid';
}

export const TrialEncouragementEmail = ({
  userName,
  tenantName,
  trialEndsAt,
  upgradeUrl,
  encouragementType,
}: TrialEncouragementEmailProps) => {
  const trialEndDate = new Date(trialEndsAt);
  const daysLeft = Math.ceil((trialEndDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
  
  const content = encouragementType === 'early' 
    ? {
        preview: `3 days in - See what ${tenantName} can do for you!`,
        heading: `How's your ${tenantName} trial going?`,
        mainText: `Hi ${userName}, you've been exploring ${tenantName} for a few days now. We're excited to see how our platform is helping streamline your business operations!`,
        benefitsTitle: "Here's what you can accomplish:",
        cta: "Continue Exploring"
      }
    : {
        preview: `Week 1 complete - Ready to unlock full potential?`,
        heading: `You're halfway through your trial!`,
        mainText: `Hi ${userName}, you've completed your first week with ${tenantName}! We hope you're seeing the value our platform brings to your business operations.`,
        benefitsTitle: "With a full subscription, you'll get:",
        cta: "Upgrade Now"
      };

  return (
    <Html>
      <Head />
      <Preview>{content.preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>{content.heading}</Heading>
          
          <Text style={text}>
            {content.mainText}
          </Text>

          <Section style={benefitsSection}>
            <Heading style={h2}>{content.benefitsTitle}</Heading>
            <ul style={benefitsList}>
              <li style={benefitItem}>📊 Complete sales and inventory management</li>
              <li style={benefitItem}>💳 Advanced POS features with multiple payment methods</li>
              <li style={benefitItem}>📈 Detailed analytics and reporting</li>
              <li style={benefitItem}>👥 Team collaboration and user management</li>
              <li style={benefitItem}>🔧 Custom integrations and automations</li>
              <li style={benefitItem}>📞 Priority customer support</li>
            </ul>
          </Section>

          <Section style={ctaSection}>
            <Text style={text}>
              Your trial expires in <strong>{daysLeft} days</strong>. Don't lose access to all these powerful features!
            </Text>
            
            <Button style={button} href={upgradeUrl}>
              {content.cta}
            </Button>
          </Section>

          <Text style={supportText}>
            Need help getting started? Our support team is here to help you make the most of your trial.
            <br />
            <Link href="mailto:support@vibepos.com" style={link}>
              Contact Support
            </Link>
          </Text>

          <Text style={footer}>
            <Link href="https://vibepos.com" target="_blank" style={{...link, color: '#898989'}}>
              VibePOS
            </Link>
            <br />
            The complete business management solution
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export default TrialEncouragementEmail;

// Styles
const main = {
  backgroundColor: '#ffffff',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
};

const container = {
  margin: '0 auto',
  padding: '20px 0 48px',
  maxWidth: '580px',
};

const h1 = {
  color: '#333',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '40px 0',
  padding: '0',
};

const h2 = {
  color: '#333',
  fontSize: '18px',
  fontWeight: 'bold',
  margin: '20px 0 10px',
};

const text = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '16px 0',
};

const benefitsSection = {
  margin: '32px 0',
  padding: '24px',
  backgroundColor: '#f8f9fa',
  borderRadius: '8px',
};

const benefitsList = {
  margin: '16px 0',
  padding: '0 0 0 20px',
};

const benefitItem = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '8px 0',
  listStyle: 'none',
};

const ctaSection = {
  textAlign: 'center' as const,
  margin: '32px 0',
};

const button = {
  backgroundColor: '#2563eb',
  borderRadius: '8px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 24px',
  margin: '16px 0',
};

const supportText = {
  color: '#666',
  fontSize: '14px',
  lineHeight: '24px',
  margin: '32px 0 16px',
  textAlign: 'center' as const,
};

const link = {
  color: '#2563eb',
  textDecoration: 'underline',
};

const footer = {
  color: '#898989',
  fontSize: '12px',
  lineHeight: '22px',
  marginTop: '12px',
  marginBottom: '24px',
  textAlign: 'center' as const,
};