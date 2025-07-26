import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

const TermsOfService = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-6">
          <Link to="/">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Button>
          </Link>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Terms of Service
          </h1>
          <p className="text-muted-foreground mt-2">
            Last updated: {new Date().toLocaleDateString()}
          </p>
        </div>

        <Card>
          <CardContent className="p-8 space-y-6">
            <section>
              <h2 className="text-2xl font-semibold mb-4">1. Acceptance of Terms</h2>
              <div className="space-y-4 text-muted-foreground">
                <p>
                  By accessing and using vibePOS ("the Service"), you accept and agree to be bound by the terms 
                  and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
                </p>
              </div>
            </section>

            <Separator />

            <section>
              <h2 className="text-2xl font-semibold mb-4">2. Description of Service</h2>
              <div className="space-y-4 text-muted-foreground">
                <p>
                  vibePOS is a cloud-based point-of-sale system that provides:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Multi-tenant POS functionality</li>
                  <li>Inventory management</li>
                  <li>Sales reporting and analytics</li>
                  <li>Customer management</li>
                  <li>Payment processing integration</li>
                  <li>User management and role-based access</li>
                </ul>
              </div>
            </section>

            <Separator />

            <section>
              <h2 className="text-2xl font-semibold mb-4">3. User Accounts</h2>
              <div className="space-y-4 text-muted-foreground">
                <p>
                  To use our Service, you must:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Provide accurate and complete registration information</li>
                  <li>Maintain the security of your account credentials</li>
                  <li>Be responsible for all activities under your account</li>
                  <li>Notify us immediately of any unauthorized use</li>
                  <li>Be at least 18 years old or have legal capacity to enter contracts</li>
                </ul>
              </div>
            </section>

            <Separator />

            <section>
              <h2 className="text-2xl font-semibold mb-4">4. Subscription and Payment</h2>
              <div className="space-y-4 text-muted-foreground">
                <p>
                  Our Service operates on a subscription model:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Fees are charged monthly or annually as selected</li>
                  <li>Payment is due in advance for each billing period</li>
                  <li>All fees are non-refundable except as required by law</li>
                  <li>We may change pricing with 30 days notice</li>
                  <li>Failure to pay may result in service suspension</li>
                </ul>
              </div>
            </section>

            <Separator />

            <section>
              <h2 className="text-2xl font-semibold mb-4">5. Acceptable Use</h2>
              <div className="space-y-4 text-muted-foreground">
                <p>
                  You agree not to use the Service to:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Violate any applicable laws or regulations</li>
                  <li>Infringe on intellectual property rights</li>
                  <li>Transmit harmful or malicious content</li>
                  <li>Attempt to gain unauthorized access to our systems</li>
                  <li>Use the service for illegal transactions</li>
                  <li>Harass or abuse other users or our staff</li>
                </ul>
              </div>
            </section>

            <Separator />

            <section>
              <h2 className="text-2xl font-semibold mb-4">6. Data and Privacy</h2>
              <div className="space-y-4 text-muted-foreground">
                <p>
                  Your data privacy is important to us:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>You retain ownership of your business data</li>
                  <li>We implement security measures to protect your data</li>
                  <li>We will not access your data except as necessary for service delivery</li>
                  <li>Data processing is governed by our Privacy Policy</li>
                  <li>You can export your data at any time</li>
                </ul>
              </div>
            </section>

            <Separator />

            <section>
              <h2 className="text-2xl font-semibold mb-4">7. Service Availability</h2>
              <div className="space-y-4 text-muted-foreground">
                <p>
                  While we strive for high availability:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>We aim for 99.9% uptime but cannot guarantee uninterrupted service</li>
                  <li>Scheduled maintenance will be announced in advance</li>
                  <li>We are not liable for service interruptions beyond our control</li>
                  <li>Emergency maintenance may occur without notice</li>
                </ul>
              </div>
            </section>

            <Separator />

            <section>
              <h2 className="text-2xl font-semibold mb-4">8. Intellectual Property</h2>
              <div className="space-y-4 text-muted-foreground">
                <p>
                  The vibePOS platform and its original content, features and functionality are and will remain 
                  the exclusive property of vibePOS and its licensors. The service is protected by copyright, 
                  trademark, and other laws.
                </p>
              </div>
            </section>

            <Separator />

            <section>
              <h2 className="text-2xl font-semibold mb-4">9. Limitation of Liability</h2>
              <div className="space-y-4 text-muted-foreground">
                <p>
                  To the maximum extent permitted by law, vibePOS shall not be liable for any indirect, 
                  incidental, special, consequential, or punitive damages, including without limitation, 
                  loss of profits, data, use, goodwill, or other intangible losses.
                </p>
              </div>
            </section>

            <Separator />

            <section>
              <h2 className="text-2xl font-semibold mb-4">10. Termination</h2>
              <div className="space-y-4 text-muted-foreground">
                <p>
                  Either party may terminate this agreement:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>You may cancel your subscription at any time</li>
                  <li>We may terminate for breach of these terms</li>
                  <li>We may suspend service for non-payment</li>
                  <li>Upon termination, your access will cease</li>
                  <li>You have 30 days to export your data after termination</li>
                </ul>
              </div>
            </section>

            <Separator />

            <section>
              <h2 className="text-2xl font-semibold mb-4">11. Support and Maintenance</h2>
              <div className="space-y-4 text-muted-foreground">
                <p>
                  We provide support through various channels:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Email support during business hours</li>
                  <li>Documentation and help resources</li>
                  <li>Regular software updates and improvements</li>
                  <li>Security patches and bug fixes</li>
                </ul>
              </div>
            </section>

            <Separator />

            <section>
              <h2 className="text-2xl font-semibold mb-4">12. Governing Law</h2>
              <div className="space-y-4 text-muted-foreground">
                <p>
                  These Terms shall be interpreted and governed by the laws of Kenya. Any disputes arising 
                  from these terms shall be subject to the exclusive jurisdiction of the courts of Kenya.
                </p>
              </div>
            </section>

            <Separator />

            <section>
              <h2 className="text-2xl font-semibold mb-4">13. Changes to Terms</h2>
              <div className="space-y-4 text-muted-foreground">
                <p>
                  We reserve the right to modify these terms at any time. We will notify users of material 
                  changes via email or through the service. Continued use after changes constitutes acceptance 
                  of the new terms.
                </p>
              </div>
            </section>

            <Separator />

            <section>
              <h2 className="text-2xl font-semibold mb-4">14. Contact Information</h2>
              <div className="space-y-4 text-muted-foreground">
                <p>
                  For questions about these Terms of Service, please contact us at:
                </p>
                <div className="bg-muted/50 p-4 rounded-lg">
                  <p><strong>Email:</strong> legal@vibepos.com</p>
                  <p><strong>Address:</strong> vibePOS Legal Department, Nairobi, Kenya</p>
                  <p><strong>Phone:</strong> +254 700 000 000</p>
                </div>
              </div>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TermsOfService;