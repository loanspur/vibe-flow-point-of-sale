import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, MapPin, Clock, Users, Code, TrendingUp, Database, PenTool, Megaphone, Target } from "lucide-react";
import { Link } from "react-router-dom";

const positionTypes = [
  { value: "software_engineer", label: "Software Engineer", icon: Code },
  { value: "social_media", label: "Social Media Specialist", icon: Users },
  { value: "data_science", label: "Data Scientist", icon: Database },
  { value: "content_creator", label: "Content Creator", icon: PenTool },
  { value: "marketing", label: "Marketing Specialist", icon: Megaphone },
  { value: "sales", label: "Sales Enthusiast", icon: Target }
];

const Careers = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    position_type: "",
    experience_years: "",
    skills: "",
    bio: "",
    portfolio_url: "",
    linkedin_url: "",
    salary_expectation: "",
    availability: "immediate"
  });
  const { toast } = useToast();

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const skillsArray = formData.skills.split(",").map(skill => skill.trim()).filter(Boolean);
      
      const { error } = await supabase
        .from('career_applications')
        .insert({
          full_name: formData.full_name,
          email: formData.email,
          phone: formData.phone || null,
          position_type: formData.position_type,
          experience_years: formData.experience_years ? parseInt(formData.experience_years) : null,
          skills: skillsArray,
          bio: formData.bio || null,
          portfolio_url: formData.portfolio_url || null,
          linkedin_url: formData.linkedin_url || null,
          salary_expectation: formData.salary_expectation || null,
          availability: formData.availability
        });

      if (error) throw error;

      toast({
        title: "Application Submitted!",
        description: "Thank you for your interest! We'll review your application and get back to you soon.",
      });

      // Reset form
      setFormData({
        full_name: "",
        email: "",
        phone: "",
        position_type: "",
        experience_years: "",
        skills: "",
        bio: "",
        portfolio_url: "",
        linkedin_url: "",
        salary_expectation: "",
        availability: "immediate"
      });

    } catch (error) {
      console.error('Error submitting application:', error);
      toast({
        title: "Submission Failed",
        description: "There was an error submitting your application. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <Link to="/">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Button>
          </Link>
          
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-4">
              Join Our Remote Team
            </h1>
            <p className="text-xl text-muted-foreground mb-6 max-w-3xl mx-auto">
              We're building the future of point-of-sale technology. Join our 100% virtual team and make an impact from anywhere in the world.
            </p>
            
            <div className="flex justify-center items-center gap-6 mb-8">
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-5 w-5" />
                <span>100% Remote</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-5 w-5" />
                <span>Flexible Hours</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <TrendingUp className="h-5 w-5" />
                <span>Growth Opportunities</span>
              </div>
            </div>
          </div>

        </div>

        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle className="text-2xl">Apply for Future Opportunities</CardTitle>
            <CardDescription>
              Don't see a perfect match? Share your bio data with us for future considerations. 
              We're always looking for talented individuals to join our growing team.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Full Name *</Label>
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) => handleInputChange('full_name', e.target.value)}
                    required
                    placeholder="Your full name"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    required
                    placeholder="your.email@example.com"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="position_type">Preferred Position *</Label>
                  <Select 
                    value={formData.position_type} 
                    onValueChange={(value) => handleInputChange('position_type', value)}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select your area of interest" />
                    </SelectTrigger>
                    <SelectContent>
                      {positionTypes.map((position) => (
                        <SelectItem key={position.value} value={position.value}>
                          {position.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="experience_years">Years of Experience</Label>
                  <Input
                    id="experience_years"
                    type="number"
                    min="0"
                    value={formData.experience_years}
                    onChange={(e) => handleInputChange('experience_years', e.target.value)}
                    placeholder="5"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="availability">Availability</Label>
                  <Select 
                    value={formData.availability} 
                    onValueChange={(value) => handleInputChange('availability', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="When can you start?" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="immediate">Immediate</SelectItem>
                      <SelectItem value="1_month">Within 1 month</SelectItem>
                      <SelectItem value="2_months">Within 2 months</SelectItem>
                      <SelectItem value="3_months">Within 3 months</SelectItem>
                      <SelectItem value="flexible">Flexible</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="skills">Skills & Technologies</Label>
                <Input
                  id="skills"
                  value={formData.skills}
                  onChange={(e) => handleInputChange('skills', e.target.value)}
                  placeholder="React, Node.js, Python, Marketing, Design, etc. (comma-separated)"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Tell us about yourself *</Label>
                <Textarea
                  id="bio"
                  value={formData.bio}
                  onChange={(e) => handleInputChange('bio', e.target.value)}
                  required
                  rows={5}
                  placeholder="Share your background, experience, and what motivates you. What unique value would you bring to our team?"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="portfolio_url">Portfolio/Website</Label>
                  <Input
                    id="portfolio_url"
                    type="url"
                    value={formData.portfolio_url}
                    onChange={(e) => handleInputChange('portfolio_url', e.target.value)}
                    placeholder="https://yourportfolio.com"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="linkedin_url">LinkedIn Profile</Label>
                  <Input
                    id="linkedin_url"
                    type="url"
                    value={formData.linkedin_url}
                    onChange={(e) => handleInputChange('linkedin_url', e.target.value)}
                    placeholder="https://linkedin.com/in/yourprofile"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="salary_expectation">Salary Expectation (Optional)</Label>
                <Input
                  id="salary_expectation"
                  value={formData.salary_expectation}
                  onChange={(e) => handleInputChange('salary_expectation', e.target.value)}
                  placeholder="$80,000 - $120,000 annually or negotiable"
                />
              </div>

              <Button 
                type="submit" 
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90"
              >
                {isLoading ? "Submitting..." : "Submit Application"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="mt-12 text-center">
          <p className="text-muted-foreground">
            Join thousands of professionals who trust vibePOS to power their businesses.
            <br />
            <strong>We're committed to building an inclusive, diverse, and remote-first team.</strong>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Careers;