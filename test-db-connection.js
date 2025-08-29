// Test script to verify database connection and schema
// Run this in the browser console to debug database issues

const testDatabaseConnection = async () => {
  try {
    console.log('Testing database connection...');
    
    // Test 1: Check if we can read from business_settings
    const { data: settings, error: readError } = await supabase
      .from('business_settings')
      .select('*')
      .limit(1);
    
    console.log('Read test result:', { settings, readError });
    
    // Test 2: Check table structure
    const { data: columns, error: columnError } = await supabase
      .rpc('get_table_columns', { table_name: 'business_settings' })
      .catch(() => ({ data: null, error: 'RPC not available' }));
    
    console.log('Column structure:', { columns, columnError });
    
    // Test 3: Try to insert a test record
    const testData = {
      tenant_id: 'test-tenant-id',
      company_name: 'Test Company',
      enable_product_units: true,
      enable_barcode_scanning: true,
      auto_generate_sku: true,
      enable_negative_stock: false,
      stock_accounting_method: 'FIFO',
      default_markup_percentage: 0.00,
      enable_retail_pricing: true,
      enable_wholesale_pricing: false,
      enable_combo_products: false,
      low_stock_threshold: 10,
      low_stock_alerts: true,
    };
    
    const { data: insertData, error: insertError } = await supabase
      .from('business_settings')
      .insert([testData])
      .select();
    
    console.log('Insert test result:', { insertData, insertError });
    
    // Test 4: Check RLS policies
    console.log('Current user:', await supabase.auth.getUser());
    
  } catch (error) {
    console.error('Database test failed:', error);
  }
};

// Run the test
testDatabaseConnection();
