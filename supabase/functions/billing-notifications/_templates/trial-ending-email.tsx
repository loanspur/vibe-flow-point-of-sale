import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
  Button,
  Section,
} from 'npm:@react-email/components@0.0.22'
import * as React from 'npm:react@18.3.1'

interface TrialEndingEmailProps {
  businessName: string
  trialEndDate: string
  planName: string
  planPrice: number
  upgradeUrl: string
}

export const TrialEndingEmail = ({
  businessName,
  trialEndDate,
  planName,
  planPrice,
  upgradeUrl,
}: TrialEndingEmailProps) => (
  <Html>
    <Head />
    <Preview>Your VibePOS trial is ending in 5 days</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Trial Ending Soon</Heading>
        
        <Text style={text}>
          Hi {businessName},
        </Text>
        
        <Text style={text}>
          Your VibePOS trial is ending on <strong>{trialEndDate}</strong> (in 5 days).
        </Text>
        
        <Text style={text}>
          To continue using VibePOS without interruption, please upgrade to the {planName} plan.
        </Text>
        
        <Section style={buttonContainer}>
          <Button style={button} href={upgradeUrl}>
            Upgrade to {planName} - KES {planPrice.toLocaleString()}/month
          </Button>
        </Section>
        
        <Text style={text}>
          Don't let your business operations stop. Upgrade now to keep your POS system running smoothly.
        </Text>
        
        <Text style={footer}>
          Best regards,<br />
          The VibePOS Team
        </Text>
      </Container>
    </Body>
  </Html>
)

export default TrialEndingEmail

const main = {
  backgroundColor: '#ffffff',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif',
}

const container = {
  margin: '0 auto',
  padding: '20px 0 48px',
  maxWidth: '560px',
}

const h1 = {
  color: '#333',
  fontSize: '24px',
  fontWeight: 'bold',
  marginBottom: '30px',
  padding: '0',
}

const text = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '26px',
  marginBottom: '20px',
}

const buttonContainer = {
  textAlign: 'center' as const,
  marginTop: '32px',
  marginBottom: '32px',
}

const button = {
  backgroundColor: '#0ea5e9',
  borderRadius: '6px',
  color: '#fff',
  fontSize: '16px',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  padding: '12px 20px',
  fontWeight: 'bold',
}

const footer = {
  color: '#898989',
  fontSize: '14px',
  marginTop: '30px',
}