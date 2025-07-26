-- Create career applications table
CREATE TABLE public.career_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  position_type TEXT NOT NULL,
  experience_years INTEGER,
  skills TEXT[],
  bio TEXT,
  portfolio_url TEXT,
  linkedin_url TEXT,
  resume_url TEXT,
  availability TEXT DEFAULT 'immediate',
  salary_expectation TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.career_applications ENABLE ROW LEVEL SECURITY;

-- Create policies for career applications
CREATE POLICY "Anyone can submit career applications" 
ON public.career_applications 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Admins can view career applications" 
ON public.career_applications 
FOR SELECT 
USING (get_current_user_role() = ANY (ARRAY['superadmin'::user_role, 'admin'::user_role]));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_career_applications_updated_at
BEFORE UPDATE ON public.career_applications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();