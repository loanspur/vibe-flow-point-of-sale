-- Basic Database Setup for vibePOS
-- Run this in your Supabase SQL Editor

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- TENANTS TABLE (Core table for multi-tenancy)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    subdomain VARCHAR(100) UNIQUE NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'trial', 'suspended')),
    plan VARCHAR(50) DEFAULT 'free' CHECK (plan IN ('free', 'basic', 'premium', 'enterprise')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on tenants
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- Create policies for tenants
CREATE POLICY "Tenants are viewable by everyone" ON public.tenants FOR SELECT USING (true);
CREATE POLICY "Only superadmins can insert tenants" ON public.tenants FOR INSERT WITH CHECK (false);
CREATE POLICY "Only superadmins can update tenants" ON public.tenants FOR UPDATE USING (false);
CREATE POLICY "Only superadmins can delete tenants" ON public.tenants FOR DELETE USING (false);

-- ============================================================================
-- PROFILES TABLE (User profiles)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    role TEXT DEFAULT 'user',
    tenant_id UUID REFERENCES public.tenants(id),
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- ============================================================================
-- TENANT_USERS TABLE (User-tenant relationships)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.tenant_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, user_id)
);

-- Enable RLS on tenant_users
ALTER TABLE public.tenant_users ENABLE ROW LEVEL SECURITY;

-- Create policies for tenant_users
CREATE POLICY "Users can view their tenant relationships" ON public.tenant_users FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their tenant relationships" ON public.tenant_users FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their tenant relationships" ON public.tenant_users FOR UPDATE USING (auth.uid() = user_id);

-- ============================================================================
-- CREATE DEFAULT TENANT
-- ============================================================================
INSERT INTO public.tenants (id, name, subdomain, status, plan) 
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Default Tenant',
    'localhost',
    'active',
    'free'
) ON CONFLICT (subdomain) DO NOTHING;

-- ============================================================================
-- CREATE FUNCTION TO HANDLE NEW USER SIGNUP
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, tenant_id)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', '00000000-0000-0000-0000-000000000001');
  
  INSERT INTO public.tenant_users (tenant_id, user_id, role)
  VALUES ('00000000-0000-0000-0000-000000000001', NEW.id, 'user');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- CREATE FUNCTION TO UPDATE TIMESTAMPS
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_tenants_updated_at
  BEFORE UPDATE ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tenant_users_updated_at
  BEFORE UPDATE ON public.tenant_users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
