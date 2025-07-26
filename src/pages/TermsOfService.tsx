import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface LegalDocument {
  document_id: string;
  version_id: string;
  title: string;
  content: string;
  version_number: string;
  effective_date: string;
}

const TermsOfService = () => {
  const [document, setDocument] = useState<LegalDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTermsOfService = async () => {
      try {
        const { data, error } = await supabase.rpc('get_current_legal_document', {
          document_type_param: 'terms_of_service',
          tenant_id_param: null
        });

        if (error) throw error;
        
        if (data && data.length > 0) {
          setDocument(data[0]);
        } else {
          setError('Terms of Service not found');
        }
      } catch (err: any) {
        console.error('Error fetching terms of service:', err);
        setError(err.message || 'Failed to load Terms of Service');
      } finally {
        setLoading(false);
      }
    };

    fetchTermsOfService();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin mx-auto" />
              <p className="text-muted-foreground">Loading Terms of Service...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !document) {
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
          </div>
          <Card>
            <CardContent className="p-8 text-center">
              <h2 className="text-2xl font-semibold mb-4">Error Loading Terms of Service</h2>
              <p className="text-muted-foreground">{error}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

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
            {document.title}
          </h1>
          <p className="text-muted-foreground mt-2">
            Version {document.version_number} • Last updated: {new Date(document.effective_date).toLocaleDateString()}
          </p>
        </div>

        <Card>
          <CardContent className="p-8">
            <div className="prose prose-gray dark:prose-invert max-w-none">
              {document.content.split('\n').map((line, index) => {
                if (line.startsWith('# ')) {
                  return <h1 key={index} className="text-3xl font-bold mb-6 mt-8 first:mt-0">{line.slice(2)}</h1>;
                } else if (line.startsWith('## ')) {
                  return <h2 key={index} className="text-2xl font-semibold mb-4 mt-6">{line.slice(3)}</h2>;
                } else if (line.startsWith('### ')) {
                  return <h3 key={index} className="text-xl font-medium mb-3 mt-4">{line.slice(4)}</h3>;
                } else if (line.startsWith('- ')) {
                  return <li key={index} className="ml-6 list-disc">{line.slice(2)}</li>;
                } else if (line.trim() === '') {
                  return <br key={index} />;
                } else if (line.trim()) {
                  return <p key={index} className="mb-4 text-muted-foreground leading-relaxed">{line}</p>;
                }
                return null;
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TermsOfService;