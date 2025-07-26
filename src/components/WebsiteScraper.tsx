import { useState } from 'react';
import { useToast } from "@/components/ui/use-toast"; 
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Globe, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface ScrapedData {
  title: string;
  markdown: string;
  html: string;
  metadata?: {
    title?: string;
    description?: string;
    keywords?: string;
    ogTitle?: string;
    ogDescription?: string;
  };
}

export const WebsiteScraper = () => {
  const { toast } = useToast();
  const [url, setUrl] = useState('https://www.loanspur.com');
  const [isLoading, setIsLoading] = useState(false);
  const [scrapedData, setScrapedData] = useState<ScrapedData | null>(null);

  const handleScrape = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setScrapedData(null);
    
    try {
      console.log('Starting scrape for URL:', url);
      
      const { data, error } = await supabase.functions.invoke('scrape-website', {
        body: { url }
      });

      if (error) {
        console.error('Supabase function error:', error);
        toast({
          title: "Error",
          description: error.message || "Failed to scrape website",
          variant: "destructive",
          duration: 5000,
        });
        return;
      }

      if (data.success && data.data) {
        console.log('Scraping successful:', data.data);
        setScrapedData(data.data);
        toast({
          title: "Success",
          description: "Website scraped successfully!",
          duration: 3000,
        });
      } else {
        console.error('Scraping failed:', data);
        toast({
          title: "Error",
          description: data.error || "Failed to scrape website",
          variant: "destructive",
          duration: 5000,
        });
      }
    } catch (error) {
      console.error('Error scraping website:', error);
      toast({
        title: "Error",
        description: "Failed to scrape website. Please try again.",
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const extractCompanyInfo = (data: ScrapedData) => {
    const text = data.markdown || '';
    const lines = text.split('\n').filter(line => line.trim());
    
    // Look for company-related information
    const companyInfo = {
      description: '',
      mission: '',
      vision: '',
      services: [] as string[],
      contact: {
        email: '',
        phone: '',
        address: ''
      }
    };

    // Extract key information patterns
    lines.forEach((line, index) => {
      const lowerLine = line.toLowerCase();
      
      // Look for mission/vision/about sections
      if (lowerLine.includes('mission') || lowerLine.includes('about')) {
        // Get next few lines as description
        const nextLines = lines.slice(index + 1, index + 4).join(' ');
        if (nextLines.length > companyInfo.description.length) {
          companyInfo.description = nextLines;
        }
      }
      
      // Look for contact information
      if (lowerLine.includes('email') && lowerLine.includes('@')) {
        const emailMatch = line.match(/[\w\.-]+@[\w\.-]+\.\w+/);
        if (emailMatch) companyInfo.contact.email = emailMatch[0];
      }
      
      if (lowerLine.includes('phone') || lowerLine.includes('tel')) {
        const phoneMatch = line.match(/[\+]?[\d\s\-\(\)]+/);
        if (phoneMatch) companyInfo.contact.phone = phoneMatch[0];
      }
    });

    return companyInfo;
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Website Content Scraper
          </CardTitle>
          <p className="text-muted-foreground">
            Scrape Loanspur.com to get company information for the footer
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleScrape} className="space-y-4">
            <div className="flex gap-2">
              <Input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://www.loanspur.com"
                className="flex-1"
                required
              />
              <Button
                type="submit"
                disabled={isLoading}
                className="min-w-[120px]"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Scraping...
                  </>
                ) : (
                  'Scrape Website'
                )}
              </Button>
            </div>
          </form>

          {scrapedData && (
            <div className="mt-6 space-y-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Info className="h-4 w-4" />
                <span>Website content extracted successfully</span>
              </div>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Company Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {scrapedData.metadata?.title && (
                    <div>
                      <h4 className="font-semibold">Title:</h4>
                      <p className="text-muted-foreground">{scrapedData.metadata.title}</p>
                    </div>
                  )}
                  
                  {scrapedData.metadata?.description && (
                    <div>
                      <h4 className="font-semibold">Description:</h4>
                      <p className="text-muted-foreground">{scrapedData.metadata.description}</p>
                    </div>
                  )}

                  <div>
                    <h4 className="font-semibold mb-2">Extracted Company Details:</h4>
                    <div className="bg-muted/50 p-4 rounded-lg">
                      {(() => {
                        const info = extractCompanyInfo(scrapedData);
                        return (
                          <div className="space-y-2 text-sm">
                            <p><strong>Company:</strong> Loanspur Limited</p>
                            <p><strong>Country:</strong> Kenya</p>
                            <p><strong>Product:</strong> vibePOS</p>
                            {info.description && (
                              <p><strong>About:</strong> {info.description}</p>
                            )}
                            {info.contact.email && (
                              <p><strong>Email:</strong> {info.contact.email}</p>
                            )}
                            {info.contact.phone && (
                              <p><strong>Phone:</strong> {info.contact.phone}</p>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  <details className="mt-4">
                    <summary className="cursor-pointer font-semibold">
                      View Raw Content (Click to expand)
                    </summary>
                    <div className="mt-2 p-4 bg-muted/30 rounded-lg max-h-60 overflow-y-auto">
                      <pre className="text-xs whitespace-pre-wrap">
                        {scrapedData.markdown.slice(0, 2000)}
                        {scrapedData.markdown.length > 2000 && '...\n[Content truncated]'}
                      </pre>
                    </div>
                  </details>
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};