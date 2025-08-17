-- Create email templates for quote, invoice, payment, and receipt management
INSERT INTO email_templates (name, type, subject, html_content, text_content, variables, is_system_template, is_active) VALUES
-- Quote templates
('Quote Sent', 'order_confirmation', 'Quote {{quote_number}} - {{company_name}}', 
'<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Quote {{quote_number}}</title>
</head>
<body style="font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f4f4f4;">
    <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #333; margin: 0;">{{company_name}}</h1>
            <p style="color: #666; margin: 10px 0 0 0;">Quote Request</p>
        </div>
        
        <div style="margin-bottom: 30px;">
            <h2 style="color: #333; border-bottom: 2px solid #e0e0e0; padding-bottom: 10px;">Dear {{customer_name}},</h2>
            <p style="line-height: 1.6; color: #555;">
                Thank you for your interest in our products/services. Please find your quote details below:
            </p>
        </div>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 6px; margin-bottom: 30px;">
            <table style="width: 100%; border-collapse: collapse;">
                <tr>
                    <td style="padding: 8px 0; color: #666; font-weight: bold;">Quote Number:</td>
                    <td style="padding: 8px 0; color: #333;">{{quote_number}}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; color: #666; font-weight: bold;">Quote Date:</td>
                    <td style="padding: 8px 0; color: #333;">{{quote_date}}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; color: #666; font-weight: bold;">Valid Until:</td>
                    <td style="padding: 8px 0; color: #333;">{{valid_until}}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; color: #666; font-weight: bold;">Total Amount:</td>
                    <td style="padding: 8px 0; color: #333; font-size: 18px; font-weight: bold;">{{total_amount}}</td>
                </tr>
            </table>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="{{quote_url}}" style="background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">View Quote Details</a>
        </div>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
            <p style="line-height: 1.6; color: #555;">
                If you have any questions about this quote, please feel free to contact us. We look forward to hearing from you.
            </p>
            <p style="margin-top: 20px; color: #666;">
                Best regards,<br>
                {{company_name}} Team
            </p>
        </div>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; text-align: center; color: #999; font-size: 12px;">
            <p>This email was sent from {{company_name}} • {{support_url}}</p>
        </div>
    </div>
</body>
</html>',
'Dear {{customer_name}},

Thank you for your interest in our products/services. Please find your quote details below:

Quote Number: {{quote_number}}
Quote Date: {{quote_date}}
Valid Until: {{valid_until}}
Total Amount: {{total_amount}}

View your quote details at: {{quote_url}}

If you have any questions about this quote, please feel free to contact us. We look forward to hearing from you.

Best regards,
{{company_name}} Team

This email was sent from {{company_name}}',
'{"customer_name": "Customer Name", "quote_number": "Quote Number", "quote_date": "Quote Date", "valid_until": "Valid Until Date", "total_amount": "Total Amount", "quote_url": "Quote View URL", "company_name": "Company Name", "support_url": "Support URL"}', 
true, true),

-- Invoice templates
('Invoice Sent', 'payment_reminder', 'Invoice {{invoice_number}} - {{company_name}}', 
'<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Invoice {{invoice_number}}</title>
</head>
<body style="font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f4f4f4;">
    <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #333; margin: 0;">{{company_name}}</h1>
            <p style="color: #666; margin: 10px 0 0 0;">Invoice</p>
        </div>
        
        <div style="margin-bottom: 30px;">
            <h2 style="color: #333; border-bottom: 2px solid #e0e0e0; padding-bottom: 10px;">Dear {{customer_name}},</h2>
            <p style="line-height: 1.6; color: #555;">
                Please find your invoice details below. Payment is due by {{due_date}}.
            </p>
        </div>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 6px; margin-bottom: 30px;">
            <table style="width: 100%; border-collapse: collapse;">
                <tr>
                    <td style="padding: 8px 0; color: #666; font-weight: bold;">Invoice Number:</td>
                    <td style="padding: 8px 0; color: #333;">{{invoice_number}}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; color: #666; font-weight: bold;">Invoice Date:</td>
                    <td style="padding: 8px 0; color: #333;">{{invoice_date}}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; color: #666; font-weight: bold;">Due Date:</td>
                    <td style="padding: 8px 0; color: #333;">{{due_date}}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; color: #666; font-weight: bold;">Amount Due:</td>
                    <td style="padding: 8px 0; color: #333; font-size: 18px; font-weight: bold;">{{amount_due}}</td>
                </tr>
            </table>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="{{invoice_url}}" style="background-color: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">View Invoice</a>
        </div>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
            <p style="line-height: 1.6; color: #555;">
                Please ensure payment is made by the due date to avoid any late fees. If you have any questions about this invoice, please contact us.
            </p>
            <p style="margin-top: 20px; color: #666;">
                Best regards,<br>
                {{company_name}} Team
            </p>
        </div>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; text-align: center; color: #999; font-size: 12px;">
            <p>This email was sent from {{company_name}} • {{support_url}}</p>
        </div>
    </div>
</body>
</html>',
'Dear {{customer_name}},

Please find your invoice details below. Payment is due by {{due_date}}.

Invoice Number: {{invoice_number}}
Invoice Date: {{invoice_date}}
Due Date: {{due_date}}
Amount Due: {{amount_due}}

View your invoice at: {{invoice_url}}

Please ensure payment is made by the due date to avoid any late fees. If you have any questions about this invoice, please contact us.

Best regards,
{{company_name}} Team

This email was sent from {{company_name}}',
'{"customer_name": "Customer Name", "invoice_number": "Invoice Number", "invoice_date": "Invoice Date", "due_date": "Due Date", "amount_due": "Amount Due", "invoice_url": "Invoice View URL", "company_name": "Company Name", "support_url": "Support URL"}', 
true, true),

-- Payment reminder template
('Payment Reminder', 'payment_reminder', 'Payment Reminder - Invoice {{invoice_number}}', 
'<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Payment Reminder - Invoice {{invoice_number}}</title>
</head>
<body style="font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f4f4f4;">
    <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #333; margin: 0;">{{company_name}}</h1>
            <p style="color: #e74c3c; margin: 10px 0 0 0; font-weight: bold;">Payment Reminder</p>
        </div>
        
        <div style="margin-bottom: 30px;">
            <h2 style="color: #333; border-bottom: 2px solid #e0e0e0; padding-bottom: 10px;">Dear {{customer_name}},</h2>
            <p style="line-height: 1.6; color: #555;">
                This is a friendly reminder that payment for the following invoice is now due.
            </p>
        </div>
        
        <div style="background-color: #fff5f5; border-left: 4px solid #e74c3c; padding: 20px; margin-bottom: 30px;">
            <table style="width: 100%; border-collapse: collapse;">
                <tr>
                    <td style="padding: 8px 0; color: #666; font-weight: bold;">Invoice Number:</td>
                    <td style="padding: 8px 0; color: #333;">{{invoice_number}}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; color: #666; font-weight: bold;">Original Due Date:</td>
                    <td style="padding: 8px 0; color: #333;">{{due_date}}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; color: #666; font-weight: bold;">Days Overdue:</td>
                    <td style="padding: 8px 0; color: #e74c3c; font-weight: bold;">{{days_overdue}}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; color: #666; font-weight: bold;">Outstanding Amount:</td>
                    <td style="padding: 8px 0; color: #e74c3c; font-size: 18px; font-weight: bold;">{{outstanding_amount}}</td>
                </tr>
            </table>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="{{payment_url}}" style="background-color: #e74c3c; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">Make Payment Now</a>
        </div>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
            <p style="line-height: 1.6; color: #555;">
                To avoid any additional late fees or service interruption, please settle this payment as soon as possible. If you have any questions or need to discuss payment arrangements, please contact us immediately.
            </p>
            <p style="margin-top: 20px; color: #666;">
                Thank you for your prompt attention to this matter.<br>
                {{company_name}} Team
            </p>
        </div>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; text-align: center; color: #999; font-size: 12px;">
            <p>This email was sent from {{company_name}} • {{support_url}}</p>
        </div>
    </div>
</body>
</html>',
'Dear {{customer_name}},

This is a friendly reminder that payment for the following invoice is now due.

Invoice Number: {{invoice_number}}
Original Due Date: {{due_date}}
Days Overdue: {{days_overdue}}
Outstanding Amount: {{outstanding_amount}}

Make payment at: {{payment_url}}

To avoid any additional late fees or service interruption, please settle this payment as soon as possible. If you have any questions or need to discuss payment arrangements, please contact us immediately.

Thank you for your prompt attention to this matter.
{{company_name}} Team

This email was sent from {{company_name}}',
'{"customer_name": "Customer Name", "invoice_number": "Invoice Number", "due_date": "Due Date", "days_overdue": "Days Overdue", "outstanding_amount": "Outstanding Amount", "payment_url": "Payment URL", "company_name": "Company Name", "support_url": "Support URL"}', 
true, true),

-- Receipt template
('Receipt Confirmation', 'order_confirmation', 'Receipt {{receipt_number}} - {{company_name}}', 
'<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Receipt {{receipt_number}}</title>
</head>
<body style="font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f4f4f4;">
    <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #333; margin: 0;">{{company_name}}</h1>
            <p style="color: #28a745; margin: 10px 0 0 0; font-weight: bold;">Payment Receipt</p>
        </div>
        
        <div style="margin-bottom: 30px;">
            <h2 style="color: #333; border-bottom: 2px solid #e0e0e0; padding-bottom: 10px;">Dear {{customer_name}},</h2>
            <p style="line-height: 1.6; color: #555;">
                Thank you for your payment. This email serves as your official receipt.
            </p>
        </div>
        
        <div style="background-color: #f0fff4; border-left: 4px solid #28a745; padding: 20px; margin-bottom: 30px;">
            <table style="width: 100%; border-collapse: collapse;">
                <tr>
                    <td style="padding: 8px 0; color: #666; font-weight: bold;">Receipt Number:</td>
                    <td style="padding: 8px 0; color: #333;">{{receipt_number}}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; color: #666; font-weight: bold;">Payment Date:</td>
                    <td style="padding: 8px 0; color: #333;">{{payment_date}}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; color: #666; font-weight: bold;">Payment Method:</td>
                    <td style="padding: 8px 0; color: #333;">{{payment_method}}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; color: #666; font-weight: bold;">Amount Paid:</td>
                    <td style="padding: 8px 0; color: #28a745; font-size: 18px; font-weight: bold;">{{amount_paid}}</td>
                </tr>
            </table>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="{{receipt_url}}" style="background-color: #6c757d; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">Download Receipt</a>
        </div>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
            <p style="line-height: 1.6; color: #555;">
                Please keep this receipt for your records. If you need any assistance or have questions about your purchase, feel free to contact us.
            </p>
            <p style="margin-top: 20px; color: #666;">
                Thank you for your business!<br>
                {{company_name}} Team
            </p>
        </div>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; text-align: center; color: #999; font-size: 12px;">
            <p>This email was sent from {{company_name}} • {{support_url}}</p>
        </div>
    </div>
</body>
</html>',
'Dear {{customer_name}},

Thank you for your payment. This email serves as your official receipt.

Receipt Number: {{receipt_number}}
Payment Date: {{payment_date}}
Payment Method: {{payment_method}}
Amount Paid: {{amount_paid}}

Download your receipt at: {{receipt_url}}

Please keep this receipt for your records. If you need any assistance or have questions about your purchase, feel free to contact us.

Thank you for your business!
{{company_name}} Team

This email was sent from {{company_name}}',
'{"customer_name": "Customer Name", "receipt_number": "Receipt Number", "payment_date": "Payment Date", "payment_method": "Payment Method", "amount_paid": "Amount Paid", "receipt_url": "Receipt URL", "company_name": "Company Name", "support_url": "Support URL"}', 
true, true);