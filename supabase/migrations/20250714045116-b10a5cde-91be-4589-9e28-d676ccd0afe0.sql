-- Create core POS system tables
-- Products table
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  cost DECIMAL(10,2),
  sku TEXT UNIQUE,
  barcode TEXT UNIQUE,
  category_id UUID,
  stock_quantity INTEGER DEFAULT 0,
  min_stock_level INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Product categories
CREATE TABLE public.product_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Customers table
CREATE TABLE public.customers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  phone TEXT,
  address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Sales/Transactions table
CREATE TABLE public.sales (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES public.customers(id),
  cashier_id UUID NOT NULL REFERENCES auth.users(id),
  total_amount DECIMAL(10,2) NOT NULL,
  tax_amount DECIMAL(10,2) DEFAULT 0,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'cash',
  status TEXT NOT NULL DEFAULT 'completed',
  receipt_number TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Sale items table
CREATE TABLE public.sale_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id),
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add foreign key for product categories
ALTER TABLE public.products 
ADD CONSTRAINT fk_products_category 
FOREIGN KEY (category_id) REFERENCES public.product_categories(id);

-- Enable RLS on all tables
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Products - readable by all authenticated users, writable by managers and above
CREATE POLICY "Everyone can view products" ON public.products
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Managers can manage products" ON public.products
FOR ALL USING (
  public.get_current_user_role() IN ('superadmin', 'admin', 'manager')
);

-- Categories - same as products
CREATE POLICY "Everyone can view categories" ON public.product_categories
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Managers can manage categories" ON public.product_categories
FOR ALL USING (
  public.get_current_user_role() IN ('superadmin', 'admin', 'manager')
);

-- Customers - readable by all, writable by cashiers and above
CREATE POLICY "Staff can view customers" ON public.customers
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Staff can manage customers" ON public.customers
FOR ALL USING (
  public.get_current_user_role() IN ('superadmin', 'admin', 'manager', 'cashier')
);

-- Sales - readable by all staff, writable by cashiers and above
CREATE POLICY "Staff can view sales" ON public.sales
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Staff can create sales" ON public.sales
FOR INSERT WITH CHECK (
  public.get_current_user_role() IN ('superadmin', 'admin', 'manager', 'cashier') AND
  auth.uid() = cashier_id
);

CREATE POLICY "Managers can update sales" ON public.sales
FOR UPDATE USING (
  public.get_current_user_role() IN ('superadmin', 'admin', 'manager')
);

-- Sale items - same as sales
CREATE POLICY "Staff can view sale items" ON public.sale_items
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Staff can manage sale items" ON public.sale_items
FOR ALL USING (
  public.get_current_user_role() IN ('superadmin', 'admin', 'manager', 'cashier')
);

-- Create triggers for updated_at
CREATE TRIGGER update_products_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_categories_updated_at
BEFORE UPDATE ON public.product_categories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_customers_updated_at
BEFORE UPDATE ON public.customers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sales_updated_at
BEFORE UPDATE ON public.sales
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some sample data
INSERT INTO public.product_categories (name, description, color) VALUES
('Beverages', 'Drinks and beverages', '#3B82F6'),
('Snacks', 'Chips, crackers, and snacks', '#10B981'),
('Electronics', 'Electronic accessories', '#8B5CF6'),
('Food', 'Fresh and packaged food items', '#F59E0B');

INSERT INTO public.products (name, description, price, cost, sku, category_id, stock_quantity, min_stock_level) VALUES
('Coca Cola 500ml', 'Classic Coca Cola bottle', 2.50, 1.20, 'COKE-500', (SELECT id FROM public.product_categories WHERE name = 'Beverages'), 100, 20),
('Lay''s Chips Original', 'Original flavor potato chips', 3.99, 2.00, 'LAYS-ORIG', (SELECT id FROM public.product_categories WHERE name = 'Snacks'), 75, 15),
('USB Cable Type-C', 'High quality USB-C cable', 12.99, 6.50, 'USB-C-001', (SELECT id FROM public.product_categories WHERE name = 'Electronics'), 25, 5),
('Sandwich - Ham & Cheese', 'Fresh ham and cheese sandwich', 6.99, 3.50, 'SAND-HC', (SELECT id FROM public.product_categories WHERE name = 'Food'), 10, 5);