import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { WebsiteScraper } from "@/components/WebsiteScraper";

const CompanyInfo = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Link to="/">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Button>
          </Link>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Company Information Scraper
          </h1>
          <p className="text-muted-foreground mt-2">
            Extract company information from Loanspur.com to update the footer content
          </p>
        </div>

        <WebsiteScraper />
      </div>
    </div>
  );
};

export default CompanyInfo;