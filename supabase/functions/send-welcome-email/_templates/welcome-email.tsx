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
  Hr,
  Img,
  Section,
} from 'npm:@react-email/components@0.0.22'
import * as React from 'npm:react@18.3.1'

interface WelcomeEmailProps {
  userName: string
  email: string
  password: string
  companyName: string
  role: string
  loginUrl: string
}

export const WelcomeEmail = ({
  userName,
  email,
  password,
  companyName,
  role,
  loginUrl,
}: WelcomeEmailProps) => (
  <Html>
    <Head />
    <Preview>Welcome to {companyName} - Your Account is Ready!</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img
          src="https://www.vibenet.shop/logo.png"
          width="120"
          height="40"
          alt="VibePOS"
          style={logo}
        />
        <Heading style={h1}>Welcome to {companyName}!</Heading>
        
        <Text style={text}>
          Hi {userName},
        </Text>
        
        <Text style={text}>
          Your account has been created and you've been assigned the role of <strong>{role}</strong> in {companyName}'s VibePOS system.
        </Text>
        
        <Text style={text}>
          VibePOS is a modern point-of-sale system that helps businesses manage their sales, inventory, customers, and much more efficiently.
        </Text>
        
        <Section style={credentialsSection}>
          <Heading style={h2}>Your Login Details</Heading>
          <Text style={credentialText}>
            <strong>Username/Email:</strong> {email}
          </Text>
          <Text style={credentialText}>
            <strong>Temporary Password:</strong> <span style={passwordStyle}>{password}</span>
          </Text>
          <Text style={credentialText}>
            <strong>Role:</strong> {role}
          </Text>
        </Section>
        
        <Text style={text}>
          <strong>Important:</strong> Please change your password after your first login for security purposes.
        </Text>
        
        <Button style={button} href={loginUrl}>
          Login to VibePOS
        </Button>
        
        <Text style={text}>
          Or copy and paste this URL into your browser:
        </Text>
        
        <Text style={code}>
          {loginUrl}
        </Text>
        
        <Hr style={hr} />
        
        <Text style={text}>
          <strong>Getting Started:</strong>
        </Text>
        <Text style={text}>
          • Explore the dashboard to familiarize yourself with the system<br/>
          • Review your permissions and available features<br/>
          • Contact your administrator if you need additional access<br/>
          • Visit our help center for guides and tutorials
        </Text>
        
        <Hr style={hr} />
        
        <Text style={footer}>
          If you have any questions or need assistance, please contact your system administrator or reach out to our support team.
        </Text>
        
        <Text style={footer}>
          <Link href="https://www.vibenet.shop" style={link}>
            VibePOS
          </Link>
          {' '}- Modern Point of Sale Solution
        </Text>
      </Container>
    </Body>
  </Html>
)

export default WelcomeEmail

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
}

const container = {
  backgroundColor: '#ffffff',
  border: '1px solid #f0f0f0',
  padding: '45px',
  borderRadius: '8px',
  margin: '40px auto',
  maxWidth: '600px',
}

const h1 = {
  color: '#333',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '0 0 30px',
  padding: '0',
}

const h2 = {
  color: '#333',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
  fontSize: '18px',
  fontWeight: 'bold',
  margin: '0 0 15px',
  padding: '0',
}

const text = {
  color: '#333',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '0 0 20px',
}

const credentialText = {
  color: '#333',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '0 0 10px',
}

const credentialsSection = {
  backgroundColor: '#f8f9fa',
  padding: '20px',
  borderRadius: '6px',
  border: '1px solid #e9ecef',
  margin: '30px 0',
}

const passwordStyle = {
  backgroundColor: '#fff3cd',
  color: '#856404',
  padding: '4px 8px',
  borderRadius: '4px',
  fontFamily: 'monospace',
  fontSize: '14px',
  fontWeight: 'bold',
}

const button = {
  backgroundColor: '#007ee6',
  borderRadius: '6px',
  color: '#fff',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  padding: '16px 32px',
  margin: '30px 0',
}

const link = {
  color: '#007ee6',
  textDecoration: 'underline',
}

const code = {
  display: 'inline-block',
  padding: '16px',
  width: '100%',
  backgroundColor: '#f4f4f4',
  borderRadius: '5px',
  border: '1px solid #eee',
  color: '#333',
  fontSize: '14px',
  fontFamily: 'monospace',
  wordBreak: 'break-all' as const,
  boxSizing: 'border-box' as const,
}

const hr = {
  borderColor: '#e6ebf1',
  margin: '30px 0',
}

const footer = {
  color: '#8898aa',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
  fontSize: '12px',
  lineHeight: '16px',
  margin: '10px 0',
}

const logo = {
  margin: '0 0 30px',
}