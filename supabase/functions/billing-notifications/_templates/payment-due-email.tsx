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

interface PaymentDueEmailProps {
  businessName: string
  billingDate: string
  planName: string
  planPrice: number
  manageUrl: string
}

export const PaymentDueEmail = ({
  businessName,
  billingDate,
  planName,
  planPrice,
  manageUrl,
}: PaymentDueEmailProps) => (
  <Html>
    <Head />
    <Preview>VibePOS payment due in 5 days</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Payment Due Soon</Heading>
        
        <Text style={text}>
          Hi {businessName},
        </Text>
        
        <Text style={text}>
          Your VibePOS subscription payment is due on <strong>{billingDate}</strong> (in 5 days).
        </Text>
        
        <Text style={text}>
          Plan: <strong>{planName}</strong><br />
          Amount: <strong>KES {planPrice.toLocaleString()}</strong>
        </Text>
        
        <Text style={text}>
          Please ensure your payment method is up to date to avoid any service interruption.
        </Text>
        
        <Section style={buttonContainer}>
          <Button style={button} href={manageUrl}>
            Manage Billing
          </Button>
        </Section>
        
        <Text style={text}>
          If you have any questions about your subscription, please don't hesitate to contact our support team.
        </Text>
        
        <Text style={footer}>
          Best regards,<br />
          The VibePOS Team
        </Text>
      </Container>
    </Body>
  </Html>
)

export default PaymentDueEmail

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