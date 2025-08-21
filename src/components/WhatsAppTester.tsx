import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Send, TestTube } from 'lucide-react';
import { useUnifiedCommunication } from '@/hooks/useUnifiedCommunication';

export const WhatsAppTester = () => {
  const [testData, setTestData] = useState({
    phone: '',
    message: 'Hello! This is a test message from your WhatsApp integration.',
    useGlobal: true
  });
  const [loading, setLoading] = useState(false);
  
  const { sendWhatsApp } = useUnifiedCommunication();

  const handleTest = async () => {
    if (!testData.phone || !testData.message) {
      return;
    }

    setLoading(true);
    try {
      await sendWhatsApp(
        testData.phone,
        testData.message,
        {
          useGlobal: testData.useGlobal
        }
      );
    } catch (error) {
      console.error('Test failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TestTube className="h-5 w-5" />
          WhatsApp Testing Center
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Test your WhatsApp integration with a simple message
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center space-x-2 p-4 bg-muted rounded-lg">
          <MessageSquare className="h-4 w-4 text-green-600" />
          <span className="text-sm font-medium">
            {testData.useGlobal ? (
              <Badge variant="default">Using Global Configuration</Badge>
            ) : (
              <Badge variant="secondary">Using Tenant Configuration</Badge>
            )}
          </span>
        </div>

        <div className="grid gap-4">
          <div>
            <Label htmlFor="phone">Recipient Phone Number</Label>
            <Input
              id="phone"
              value={testData.phone}
              onChange={(e) => setTestData(prev => ({ ...prev, phone: e.target.value }))}
              placeholder="+1234567890"
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Include country code (e.g., +1 for US, +254 for Kenya)
            </p>
          </div>

          <div>
            <Label htmlFor="message">Test Message</Label>
            <Textarea
              id="message"
              value={testData.message}
              onChange={(e) => setTestData(prev => ({ ...prev, message: e.target.value }))}
              placeholder="Enter your test message..."
              rows={3}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              checked={testData.useGlobal}
              onCheckedChange={(checked) =>
                setTestData(prev => ({ ...prev, useGlobal: checked }))
              }
            />
            <Label>Use Global WhatsApp Configuration</Label>
          </div>

          <Button 
            onClick={handleTest} 
            disabled={loading || !testData.phone || !testData.message}
            className="w-full"
          >
            <Send className="h-4 w-4 mr-2" />
            {loading ? 'Sending...' : 'Send Test Message'}
          </Button>
        </div>

        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="font-semibold text-blue-900 mb-2">How to Test:</h4>
          <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
            <li>Enter a valid WhatsApp phone number (including country code)</li>
            <li>Toggle "Use Global Configuration" to test with system-wide settings</li>
            <li>Click "Send Test Message" to send via 360messenger API</li>
            <li>Check the recipient's WhatsApp for the message</li>
            <li>Monitor the console/logs for any errors</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
};