-- Insert dummy tenants
INSERT INTO public.tenants (id, name, subdomain, contact_email, contact_phone, address, plan_type, max_users, is_active) VALUES
('11111111-1111-1111-1111-111111111111', 'Coffee Corner Cafe', 'coffee-corner', 'admin@coffeecorner.com', '+1-555-0101', '123 Main St, Downtown, NY 10001', 'premium', 50, true),
('22222222-2222-2222-2222-222222222222', 'Tech Gadgets Store', 'tech-gadgets', 'manager@techgadgets.com', '+1-555-0202', '456 Tech Ave, Silicon Valley, CA 94101', 'business', 25, true),
('33333333-3333-3333-3333-333333333333', 'Fashion Boutique', 'fashion-boutique', 'owner@fashionboutique.com', '+1-555-0303', '789 Style Blvd, Fashion District, NY 10018', 'basic', 10, true);

-- Insert dummy product categories for Coffee Corner Cafe
INSERT INTO public.product_categories (id, name, description, color, tenant_id) VALUES
('aaaa1111-1111-1111-1111-111111111111', 'Beverages', 'Hot and cold drinks', '#8B4513', '11111111-1111-1111-1111-111111111111'),
('aaaa2222-2222-2222-2222-222222222222', 'Food', 'Pastries, sandwiches and snacks', '#F4A460', '11111111-1111-1111-1111-111111111111'),
('aaaa3333-3333-3333-3333-333333333333', 'Merchandise', 'Coffee beans, mugs and accessories', '#D2691E', '11111111-1111-1111-1111-111111111111');

-- Insert dummy product categories for Tech Gadgets Store
INSERT INTO public.product_categories (id, name, description, color, tenant_id) VALUES
('bbbb1111-1111-1111-1111-111111111111', 'Smartphones', 'Mobile phones and accessories', '#4169E1', '22222222-2222-2222-2222-222222222222'),
('bbbb2222-2222-2222-2222-222222222222', 'Laptops', 'Portable computers and peripherals', '#32CD32', '22222222-2222-2222-2222-222222222222'),
('bbbb3333-3333-3333-3333-333333333333', 'Audio', 'Headphones, speakers and audio gear', '#FF6347', '22222222-2222-2222-2222-222222222222');

-- Insert dummy product categories for Fashion Boutique
INSERT INTO public.product_categories (id, name, description, color, tenant_id) VALUES
('cccc1111-1111-1111-1111-111111111111', 'Clothing', 'Dresses, tops, pants and outerwear', '#FF69B4', '33333333-3333-3333-3333-333333333333'),
('cccc2222-2222-2222-2222-222222222222', 'Accessories', 'Bags, jewelry and fashion accessories', '#9370DB', '33333333-3333-3333-3333-333333333333'),
('cccc3333-3333-3333-3333-333333333333', 'Shoes', 'Footwear for all occasions', '#20B2AA', '33333333-3333-3333-3333-333333333333');

-- Insert dummy products for Coffee Corner Cafe
INSERT INTO public.products (id, name, description, price, cost, sku, stock_quantity, min_stock_level, category_id, tenant_id, is_active) VALUES
('11111111-1111-1111-1111-111111111001', 'Espresso', 'Rich, bold single shot of espresso', 2.50, 0.75, 'ESP001', 100, 10, 'aaaa1111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', true),
('11111111-1111-1111-1111-111111111002', 'Cappuccino', 'Espresso with steamed milk and foam', 4.25, 1.25, 'CAP001', 75, 8, 'aaaa1111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', true),
('11111111-1111-1111-1111-111111111003', 'Latte', 'Smooth espresso with steamed milk', 4.75, 1.50, 'LAT001', 80, 10, 'aaaa1111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', true),
('11111111-1111-1111-1111-111111111004', 'Croissant', 'Buttery, flaky French pastry', 3.50, 1.00, 'CRO001', 25, 5, 'aaaa2222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', true),
('11111111-1111-1111-1111-111111111005', 'Blueberry Muffin', 'Fresh baked muffin with blueberries', 2.95, 0.85, 'MUF001', 30, 5, 'aaaa2222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', true),
('11111111-1111-1111-1111-111111111006', 'Coffee Beans - House Blend', 'Premium coffee beans, 1lb bag', 12.99, 6.50, 'CB001', 50, 8, 'aaaa3333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', true);

-- Insert dummy products for Tech Gadgets Store  
INSERT INTO public.products (id, name, description, price, cost, sku, stock_quantity, min_stock_level, category_id, tenant_id, is_active) VALUES
('22222222-2222-2222-2222-222222222001', 'iPhone 15 Pro', 'Latest Apple smartphone with Pro features', 999.99, 750.00, 'IP15P001', 15, 3, 'bbbb1111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', true),
('22222222-2222-2222-2222-222222222002', 'Samsung Galaxy S24', 'Flagship Android smartphone', 899.99, 650.00, 'SGS24001', 20, 5, 'bbbb1111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', true),
('22222222-2222-2222-2222-222222222003', 'MacBook Air M3', '13-inch laptop with M3 chip', 1299.99, 950.00, 'MBA13001', 8, 2, 'bbbb2222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', true),
('22222222-2222-2222-2222-222222222004', 'Dell XPS 13', 'Premium Windows ultrabook', 1199.99, 850.00, 'DXP13001', 12, 3, 'bbbb2222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', true),
('22222222-2222-2222-2222-222222222005', 'Sony WH-1000XM5', 'Noise-canceling wireless headphones', 399.99, 200.00, 'SWH1000001', 25, 5, 'bbbb3333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', true),
('22222222-2222-2222-2222-222222222006', 'AirPods Pro 2', 'Apple wireless earbuds with ANC', 249.99, 150.00, 'APP2001', 30, 8, 'bbbb3333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', true);

-- Insert dummy products for Fashion Boutique
INSERT INTO public.products (id, name, description, price, cost, sku, stock_quantity, min_stock_level, category_id, tenant_id, is_active) VALUES
('33333333-3333-3333-3333-333333333001', 'Summer Dress', 'Flowy midi dress perfect for summer', 89.99, 35.00, 'SD001', 15, 3, 'cccc1111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', true),
('33333333-3333-3333-3333-333333333002', 'Denim Jacket', 'Classic blue denim jacket', 79.99, 30.00, 'DJ001', 20, 4, 'cccc1111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', true),
('33333333-3333-3333-3333-333333333003', 'Leather Handbag', 'Genuine leather tote bag', 159.99, 70.00, 'LHB001', 8, 2, 'cccc2222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333', true),
('33333333-3333-3333-3333-333333333004', 'Statement Necklace', 'Bold gold-toned statement piece', 49.99, 15.00, 'SN001', 25, 5, 'cccc2222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333', true),
('33333333-3333-3333-3333-333333333005', 'High Heel Pumps', 'Classic black high heel shoes', 129.99, 50.00, 'HHP001', 12, 3, 'cccc3333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333', true),
('33333333-3333-3333-3333-333333333006', 'Sneakers', 'Comfortable white canvas sneakers', 69.99, 25.00, 'SNK001', 18, 4, 'cccc3333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333', true);

-- Insert dummy customers for Coffee Corner Cafe
INSERT INTO public.customers (id, name, email, phone, address, tenant_id) VALUES
('11111111-1111-1111-1111-111111110001', 'John Smith', 'john.smith@email.com', '+1-555-1001', '100 Oak Street, Downtown, NY 10001', '11111111-1111-1111-1111-111111111111'),
('11111111-1111-1111-1111-111111110002', 'Emily Johnson', 'emily.j@email.com', '+1-555-1002', '200 Pine Avenue, Downtown, NY 10001', '11111111-1111-1111-1111-111111111111'),
('11111111-1111-1111-1111-111111110003', 'Coffee Lovers Inc', 'orders@coffeelovers.com', '+1-555-1003', '300 Business Plaza, Downtown, NY 10001', '11111111-1111-1111-1111-111111111111');

-- Insert dummy customers for Tech Gadgets Store
INSERT INTO public.customers (id, name, email, phone, address, tenant_id) VALUES
('22222222-2222-2222-2222-222222220001', 'Alex Tech', 'alex@techie.com', '+1-555-2001', '400 Silicon Drive, Silicon Valley, CA 94101', '22222222-2222-2222-2222-222222222222'),
('22222222-2222-2222-2222-222222220002', 'Sarah Digital', 'sarah.d@gmail.com', '+1-555-2002', '500 Innovation Blvd, Silicon Valley, CA 94101', '22222222-2222-2222-2222-222222222222'),
('22222222-2222-2222-2222-222222220003', 'TechCorp Solutions', 'procurement@techcorp.com', '+1-555-2003', '600 Corporate Center, Silicon Valley, CA 94101', '22222222-2222-2222-2222-222222222222');

-- Insert dummy customers for Fashion Boutique
INSERT INTO public.customers (id, name, email, phone, address, tenant_id) VALUES
('33333333-3333-3333-3333-333333330001', 'Isabella Fashion', 'bella@fashionista.com', '+1-555-3001', '700 Style Street, Fashion District, NY 10018', '33333333-3333-3333-3333-333333333333'),
('33333333-3333-3333-3333-333333330002', 'Michael Trendy', 'mike.trendy@email.com', '+1-555-3002', '800 Runway Road, Fashion District, NY 10018', '33333333-3333-3333-3333-333333333333'),
('33333333-3333-3333-3333-333333330003', 'Boutique Buyers Co', 'orders@boutique.com', '+1-555-3003', '900 Designer Ave, Fashion District, NY 10018', '33333333-3333-3333-3333-333333333333');

-- Insert some product variants for better demo
INSERT INTO public.product_variants (id, product_id, name, value, price_adjustment, stock_quantity) VALUES
('11111111-1111-1111-1111-111111110011', '11111111-1111-1111-1111-111111111002', 'Size', 'Small', 0.00, 25),
('11111111-1111-1111-1111-111111110012', '11111111-1111-1111-1111-111111111002', 'Size', 'Large', 0.50, 50),
('22222222-2222-2222-2222-222222220011', '22222222-2222-2222-2222-222222222001', 'Storage', '128GB', 0.00, 8),
('22222222-2222-2222-2222-222222220012', '22222222-2222-2222-2222-222222222001', 'Storage', '256GB', 100.00, 5),
('22222222-2222-2222-2222-222222220013', '22222222-2222-2222-2222-222222222001', 'Storage', '512GB', 200.00, 2),
('33333333-3333-3333-3333-333333330011', '33333333-3333-3333-3333-333333333001', 'Size', 'XS', 0.00, 3),
('33333333-3333-3333-3333-333333330012', '33333333-3333-3333-3333-333333333001', 'Size', 'S', 0.00, 5),
('33333333-3333-3333-3333-333333330013', '33333333-3333-3333-3333-333333333001', 'Size', 'M', 0.00, 4),
('33333333-3333-3333-3333-333333330014', '33333333-3333-3333-3333-333333333001', 'Size', 'L', 0.00, 3);