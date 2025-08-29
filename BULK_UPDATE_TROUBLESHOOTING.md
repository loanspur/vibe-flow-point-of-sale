# Bulk Update Troubleshooting Guide

## Error: Database Constraint Violation

### **Error Message:**
```
Bulk Update Error: Bulk update failed: Failed to create migration record:
new row for relation "product_migrations" violates
check constraint "product_migrations_migration_type_check"
```

### **Root Cause:**
The database constraint `product_migrations_migration_type_check` only allows `'import'` and `'export'` as valid migration types, but the bulk update feature tries to use `'bulk_update'` as the migration type.

### **Solution:**
Run the following SQL script in your Supabase SQL editor to fix the constraint:

```sql
-- Fix migration_type constraint to allow 'bulk_update'
ALTER TABLE public.product_migrations 
DROP CONSTRAINT IF EXISTS product_migrations_migration_type_check;

ALTER TABLE public.product_migrations 
ADD CONSTRAINT product_migrations_migration_type_check 
CHECK (migration_type IN ('import', 'export', 'bulk_update'));
```

### **Complete Fix Script:**
Use the file `fix_bulk_update_migration_constraint.sql` that was created in your project root. This script:
1. Shows the current constraint
2. Drops the old constraint
3. Creates a new constraint that includes 'bulk_update'
4. Tests the fix with a sample insert
5. Verifies the constraint is working

### **Steps to Apply the Fix:**

1. **Open Supabase Dashboard**
   - Go to your Supabase project dashboard
   - Navigate to the SQL Editor

2. **Run the Fix Script**
   - Copy the contents of `fix_bulk_update_migration_constraint.sql`
   - Paste it into the SQL editor
   - Click "Run" to execute the script

3. **Verify the Fix**
   - The script will show "Bulk update migration constraint fix completed successfully!"
   - You should see the updated constraint definition

4. **Test the Bulk Update Feature**
   - Go back to your application
   - Try the bulk update feature again
   - It should now work without the constraint error

## Other Common Issues

### **Template Download Issues**
- **Problem**: Template download fails or is empty
- **Solution**: Check if you have products in your database. The template generation requires existing products.

### **File Upload Issues**
- **Problem**: File upload fails or shows "No file selected"
- **Solution**: Ensure you're uploading a CSV file and that the file is not corrupted.

### **Update Not Applying**
- **Problem**: Products are not being updated despite successful processing
- **Solution**: 
  - Check that you're not changing the product ID column
  - Verify that the values you're changing are actually different from current values
  - Ensure category/unit/location names exist in your system

### **Performance Issues**
- **Problem**: Bulk update is very slow for large files
- **Solution**: 
  - Consider breaking large updates into smaller batches
  - Check your network connection
  - Monitor the progress bar for updates

## Prevention Tips

### **Before Running Bulk Updates:**
1. **Backup Your Data**: Always backup your product data before bulk updates
2. **Test Small**: Test with a few products first before updating hundreds
3. **Validate Data**: Check your CSV file for formatting issues
4. **Check References**: Ensure category/unit/location names exist

### **During Bulk Updates:**
1. **Monitor Progress**: Watch the progress bar for any issues
2. **Don't Close Browser**: Keep the browser open during processing
3. **Check Network**: Ensure stable internet connection

### **After Bulk Updates:**
1. **Review Results**: Always check the update results
2. **Download Report**: Save the status report for audit purposes
3. **Verify Changes**: Check a few products to ensure updates were applied correctly

## Debug Information

### **Console Logs**
Check your browser's developer console for detailed error information:
1. Open Developer Tools (F12)
2. Go to Console tab
3. Look for any error messages during bulk update

### **Network Tab**
Monitor API calls in the Network tab:
1. Open Developer Tools (F12)
2. Go to Network tab
3. Look for failed API calls during bulk update

### **Database Logs**
Check Supabase logs for database-level errors:
1. Go to Supabase Dashboard
2. Navigate to Logs
3. Look for any constraint violations or errors

## Support

If you continue to experience issues after applying the fix:

1. **Check the Error Details**: Look at the specific error message for clues
2. **Review the Documentation**: Check the main bulk update documentation
3. **Test with Sample Data**: Try with a simple CSV file first
4. **Contact Support**: If the issue persists, provide the error details and steps to reproduce

## Related Files

- `fix_bulk_update_migration_constraint.sql` - Database constraint fix
- `BULK_UPDATE_ENHANCEMENT.md` - Complete feature documentation
- `src/lib/migration-service.ts` - Bulk update implementation
- `src/components/UnifiedMigration.tsx` - Bulk update UI
