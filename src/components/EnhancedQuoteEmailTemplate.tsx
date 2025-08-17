import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Download } from "lucide-react";

interface EnhancedQuoteEmailTemplateProps {
  customerName: string;
  quoteNumber: string;
  quoteDate: string;
  validUntil: string;
  totalAmount: string;
  quoteUrl: string;
  quoteDownloadUrl: string;
  companyName: string;
  companyLogo?: string;
  companyAddress?: string;
  companyPhone?: string;
  companyEmail?: string;
}

export const generateEnhancedQuoteEmailHTML = (props: EnhancedQuoteEmailTemplateProps) => {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Quote ${props.quoteNumber}</title>
    <style>
        body {
            font-family: 'Arial', sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 0;
            background-color: #f8fafc;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background: white;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header {
            background: linear-gradient(135deg, #2563eb, #1d4ed8);
            color: white;
            padding: 30px;
            text-align: center;
        }
        .company-logo {
            max-width: 120px;
            height: auto;
            margin-bottom: 15px;
        }
        .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 600;
        }
        .content {
            padding: 30px;
        }
        .greeting {
            font-size: 18px;
            margin-bottom: 20px;
            color: #1f2937;
        }
        .quote-info {
            background: #f1f5f9;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
            border-left: 4px solid #2563eb;
        }
        .quote-detail {
            display: flex;
            justify-content: space-between;
            margin: 8px 0;
            align-items: center;
        }
        .quote-detail strong {
            color: #374151;
        }
        .total-amount {
            font-size: 24px;
            font-weight: 700;
            color: #2563eb;
        }
        .action-buttons {
            text-align: center;
            margin: 30px 0;
        }
        .btn {
            display: inline-block;
            padding: 12px 24px;
            margin: 8px;
            border-radius: 6px;
            text-decoration: none;
            font-weight: 600;
            transition: all 0.2s;
        }
        .btn-primary {
            background: #2563eb;
            color: white;
        }
        .btn-primary:hover {
            background: #1d4ed8;
        }
        .btn-outline {
            background: transparent;
            color: #2563eb;
            border: 2px solid #2563eb;
        }
        .btn-outline:hover {
            background: #2563eb;
            color: white;
        }
        .footer {
            background: #f8fafc;
            padding: 20px;
            text-align: center;
            border-top: 1px solid #e5e7eb;
            font-size: 14px;
            color: #6b7280;
        }
        .company-info {
            margin-top: 15px;
            line-height: 1.5;
        }
        .validity-badge {
            background: #fef3c7;
            color: #92400e;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            ${props.companyLogo ? `<img src="${props.companyLogo}" alt="${props.companyName}" class="company-logo">` : ''}
            <h1>Quote Ready for Review</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">From ${props.companyName}</p>
        </div>
        
        <div class="content">
            <div class="greeting">
                Hello ${props.customerName},
            </div>
            
            <p>Thank you for your interest in our products and services. We've prepared a detailed quote for your review.</p>
            
            <div class="quote-info">
                <div class="quote-detail">
                    <span><strong>Quote Number:</strong></span>
                    <span>${props.quoteNumber}</span>
                </div>
                <div class="quote-detail">
                    <span><strong>Quote Date:</strong></span>
                    <span>${props.quoteDate}</span>
                </div>
                <div class="quote-detail">
                    <span><strong>Valid Until:</strong></span>
                    <span class="validity-badge">${props.validUntil}</span>
                </div>
                <div class="quote-detail" style="border-top: 1px solid #e5e7eb; padding-top: 15px; margin-top: 15px;">
                    <span><strong>Total Amount:</strong></span>
                    <span class="total-amount">${props.totalAmount}</span>
                </div>
            </div>
            
            <div class="action-buttons">
                <a href="${props.quoteUrl}" class="btn btn-primary" target="_blank">
                    View Quote Online
                </a>
                <a href="${props.quoteDownloadUrl}" class="btn btn-outline" target="_blank">
                    Download PDF
                </a>
            </div>
            
            <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
                <strong>Note:</strong> This quote is valid until ${props.validUntil}. No login is required to view or download your quote.
            </p>
            
            <p>If you have any questions about this quote or would like to discuss your requirements further, please don't hesitate to contact us.</p>
            
            <p>We look forward to working with you!</p>
            
            <p style="margin-top: 30px;">
                Best regards,<br>
                <strong>${props.companyName}</strong>
            </p>
        </div>
        
        <div class="footer">
            <div class="company-info">
                <strong>${props.companyName}</strong><br>
                ${props.companyAddress ? props.companyAddress + '<br>' : ''}
                ${props.companyPhone ? 'Phone: ' + props.companyPhone + '<br>' : ''}
                ${props.companyEmail ? 'Email: ' + props.companyEmail : ''}
            </div>
            <p style="margin-top: 15px; font-size: 12px;">
                This email was sent regarding Quote #${props.quoteNumber}. 
                If you believe you received this email in error, please contact us.
            </p>
        </div>
    </div>
</body>
</html>`;
};

// React component for preview
export const EnhancedQuoteEmailTemplate: React.FC<EnhancedQuoteEmailTemplateProps> = (props) => {
  return (
    <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 text-center">
        {props.companyLogo && (
          <img src={props.companyLogo} alt={props.companyName} className="h-12 mx-auto mb-3" />
        )}
        <h1 className="text-2xl font-semibold">Quote Ready for Review</h1>
        <p className="opacity-90">From {props.companyName}</p>
      </div>
      
      <div className="p-6">
        <div className="text-lg mb-4">Hello {props.customerName},</div>
        
        <p className="mb-4">Thank you for your interest in our products and services. We've prepared a detailed quote for your review.</p>
        
        <Card className="my-6">
          <CardContent className="p-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="font-medium">Quote Number:</span>
                <span>{props.quoteNumber}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-medium">Quote Date:</span>
                <span>{props.quoteDate}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-medium">Valid Until:</span>
                <Badge variant="secondary">{props.validUntil}</Badge>
              </div>
              <div className="flex justify-between items-center pt-3 border-t">
                <span className="font-medium">Total Amount:</span>
                <span className="text-xl font-bold text-blue-600">{props.totalAmount}</span>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <div className="text-center space-y-3 my-6">
          <Button asChild>
            <a href={props.quoteUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 mr-2" />
              View Quote Online
            </a>
          </Button>
          <Button variant="outline" asChild>
            <a href={props.quoteDownloadUrl} target="_blank" rel="noopener noreferrer">
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </a>
          </Button>
        </div>
        
        <div className="text-sm text-muted-foreground p-3 bg-muted rounded-lg mb-4">
          <strong>Note:</strong> This quote is valid until {props.validUntil}. No login is required to view or download your quote.
        </div>
        
        <p className="mb-4">If you have any questions about this quote or would like to discuss your requirements further, please don't hesitate to contact us.</p>
        
        <p className="mb-4">We look forward to working with you!</p>
        
        <p className="mt-6">
          Best regards,<br />
          <strong>{props.companyName}</strong>
        </p>
      </div>
      
      <div className="bg-muted p-4 text-center text-sm text-muted-foreground">
        <div className="font-medium">{props.companyName}</div>
        {props.companyAddress && <div>{props.companyAddress}</div>}
        {props.companyPhone && <div>Phone: {props.companyPhone}</div>}
        {props.companyEmail && <div>Email: {props.companyEmail}</div>}
        <p className="mt-3 text-xs">
          This email was sent regarding Quote #{props.quoteNumber}. 
          If you believe you received this email in error, please contact us.
        </p>
      </div>
    </div>
  );
};