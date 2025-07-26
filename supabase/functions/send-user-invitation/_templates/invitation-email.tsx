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
} from 'npm:@react-email/components@0.0.22'
import * as React from 'npm:react@18.3.1'

interface InvitationEmailProps {
  inviterName: string
  companyName: string
  roleName: string
  invitationUrl: string
}

export const InvitationEmail = ({
  inviterName,
  companyName,
  roleName,
  invitationUrl,
}: InvitationEmailProps) => (
  <Html>
    <Head />
    <Preview>You're invited to join {companyName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img
          src="https://www.vibepos.shop/logo.png"
          width="120"
          height="40"
          alt="VibePOS"
          style={logo}
        />
        <Heading style={h1}>You're invited to join {companyName}</Heading>
        
        <Text style={text}>
          Hi there!
        </Text>
        
        <Text style={text}>
          <strong>{inviterName}</strong> has invited you to join <strong>{companyName}</strong> as a <strong>{roleName}</strong>.
        </Text>
        
        <Text style={text}>
          vibePOS is a modern point-of-sale system that helps businesses manage their sales, inventory, and customers efficiently.
        </Text>
        
        <Button style={button} href={invitationUrl}>
          Accept Invitation
        </Button>
        
        <Text style={text}>
          Or copy and paste this link into your browser:
        </Text>
        
        <Text style={code}>
          {invitationUrl}
        </Text>
        
        <Hr style={hr} />
        
        <Text style={footer}>
          This invitation will expire in 72 hours. If you didn't expect this invitation, you can safely ignore this email.
        </Text>
        
        <Text style={footer}>
          <Link href="https://www.vibepos.shop" style={link}>
            vibePOS
          </Link>
          {' '}- Modern Point of Sale Solution
        </Text>
      </Container>
    </Body>
  </Html>
)

export default InvitationEmail

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

const text = {
  color: '#333',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '0 0 20px',
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