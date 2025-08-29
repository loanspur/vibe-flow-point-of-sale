# Migration Error Debugging Guide

## Enhanced Error Reporting

The migration system has been enhanced to provide detailed error information instead of generic "Unknown error" messages. This guide will help you identify and resolve specific migration issues.

## How to Get Detailed Error Information

### **1. Browser Console Logs**
When a migration fails, check your browser's developer console (F12) for detailed error logs:

```javascript
// Look for these console messages:
console.error('Migration import error:', error);
console.error('Migration error details:', { error, message, stack, importType, fileName });
console.error('Migration row X error:', { row, error, errorMessage, rowName });
```

### **2. Error Toast Messages**
The error toast will now show specific error messages instead of "Unknown error occurred".

### **3. Migration Record Details**
Check the `product_migrations` table in your database for detailed error messages stored in the `error_message` column.

## Common Error Types and Solutions

### **1. Database Connection Errors**
```
Error: Failed to create migration record: Database error
```
**Solution:**
- Check your Supabase connection
- Verify the `product_migrations` table exists
- Run the table creation script if needed

### **2. CSV Format Errors**
```
Error: CSV file must have at least a header row and one data row
Error: CSV file has no valid headers
Error: No valid data found in CSV file
```
**Solution:**
- Ensure your CSV file has a header row
- Make sure the first row contains column names
- Verify at least one data row exists
- Check that the name field is not empty

### **3. Required Field Errors**
```
Error: Product name is required
Error: Valid price is required
```
**Solution:**
- Ensure all required fields are present
- Check that price values are numeric
- Verify name fields are not empty

### **4. Duplicate Detection Errors**
```
Error: Product with name "X" already exists
Error: Product with SKU "Y" already exists
```
**Solution:**
- Use unique names and SKUs
- Check existing products in your system
- Consider updating existing products instead

### **5. Entity Resolution Errors**
```
Error: Category "X" not found
Error: Unit "Y" not found
Error: Location "Z" not found
```
**Solution:**
- Create the missing categories, units, or locations first
- Use exact names that match your existing data
- Check spelling and case sensitivity

### **6. Database Constraint Errors**
```
Error: Database error: duplicate key value violates unique constraint
Error: Database error: null value in column "tenant_id" violates not-null constraint
```
**Solution:**
- Check for duplicate values in unique fields
- Ensure all required fields have values
- Verify tenant_id is properly set

## Step-by-Step Debugging Process

### **Step 1: Check Console Logs**
1. Open browser developer tools (F12)
2. Go to Console tab
3. Try the migration again
4. Look for detailed error logs

### **Step 2: Verify CSV Format**
1. Open your CSV file in a text editor
2. Check that the first row contains headers
3. Verify at least one data row exists
4. Ensure required fields are present

### **Step 3: Check Database State**
1. Verify the `product_migrations` table exists
2. Check for any existing migration records
3. Look at the `error_message` column for details

### **Step 4: Test with Sample Data**
1. Download a template from the migration interface
2. Fill in minimal required data
3. Test the import with this sample file

## CSV File Requirements

### **Products CSV Format**
```csv
name,description,sku,cost_price,price,wholesale_price,stock_quantity,category,unit,location,revenue_account
Sample Product,Description,SKU001,10.00,20.00,15.00,100,Electronics,Pieces,Main Store,Inventory
```

### **Required Fields for Products**
- `name` - Product name (required)
- `price` - Retail price (required)

### **Optional Fields for Products**
- `description` - Product description
- `sku` - Stock keeping unit
- `cost_price` - Cost price
- `wholesale_price` - Wholesale price
- `stock_quantity` - Initial stock quantity
- `category` - Product category (must exist)
- `unit` - Product unit (must exist)
- `location` - Store location (must exist)
- `revenue_account` - Revenue account (auto-mapped to inventory if not specified)

## Troubleshooting Specific Issues

### **Issue: "Unknown error occurred"**
**Debugging Steps:**
1. Check browser console for detailed logs
2. Look for specific error messages in the logs
3. Check the migration record in the database
4. Verify all required tables exist

### **Issue: Migration starts but fails on specific rows**
**Debugging Steps:**
1. Check console logs for row-specific errors
2. Verify the data in the failing rows
3. Check if referenced entities exist (categories, units, locations)
4. Ensure data types are correct (numbers for prices, etc.)

### **Issue: Migration appears to succeed but no data is imported**
**Debugging Steps:**
1. Check if rows are being skipped due to missing names
2. Verify the CSV format is correct
3. Check for validation errors in the console
4. Look at the migration record status

### **Issue: Database constraint violations**
**Debugging Steps:**
1. Check for duplicate values in unique fields
2. Verify all required fields have values
3. Check data types match column definitions
4. Ensure foreign key references exist

## Error Prevention Best Practices

### **1. Validate Data Before Import**
- Use the template download feature
- Check your CSV format matches the template
- Verify all referenced entities exist

### **2. Test with Small Datasets**
- Start with a few records
- Verify the import works correctly
- Then proceed with larger datasets

### **3. Backup Before Large Imports**
- Export existing data first
- Keep a backup of your current state
- Test imports in a development environment

### **4. Monitor Console Logs**
- Keep developer tools open during migration
- Watch for error messages
- Address issues before they compound

## Getting Help

If you're still experiencing issues after following this guide:

1. **Collect Error Information:**
   - Copy the exact error message from the console
   - Note the row number where the error occurred
   - Include the CSV file structure (first few rows)

2. **Check System State:**
   - Verify the `product_migrations` table exists
   - Check if referenced entities exist
   - Confirm your Supabase connection is working

3. **Provide Context:**
   - What type of data are you trying to import?
   - How many records are in your CSV?
   - What specific error messages are you seeing?

## Example Error Resolution

### **Error: "Row 3 (Product XYZ): Category 'Electronics' not found"**

**Solution:**
1. Create the "Electronics" category in your system first
2. Or change the category name in your CSV to match an existing category
3. Re-run the migration

### **Error: "Row 5 (Product ABC): Valid price is required"**

**Solution:**
1. Check row 5 in your CSV file
2. Ensure the price column has a valid numeric value
3. Remove any non-numeric characters from the price field
4. Re-run the migration

This enhanced error reporting will help you quickly identify and resolve migration issues instead of dealing with generic "Unknown error" messages.
