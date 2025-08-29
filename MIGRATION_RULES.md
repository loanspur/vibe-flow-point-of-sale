# Unified Data Migration System Documentation

## Overview
This document describes the unified data migration system that consolidates all tenant data migration rules for products, contacts, and categories, eliminating redundancy and providing a single source of truth for migration logic.

## Architecture

### Core Components
- **`src/lib/migration-utils.ts`** - Centralized utilities for all migration operations
- **`src/lib/migration-service.ts`** - Unified service class handling all entity types
- **`src/components/UnifiedMigration.tsx`** - Single UI component for all migration operations

### Database Schema
- **Table**: `product_migrations` (created via `create_product_migrations_table_safe.sql`)
- **Primary Key**: UUID (auto-generated)
- **Status Values**: `pending`, `processing`, `completed`, `failed`, `rolled_back`
- **Migration Types**: `import`, `export`
- **RLS Policies**: Tenant-based access control

## Supported Entity Types

### Products
- **Required Fields**: `name`, `price`
- **Optional Fields**: `description`, `sku`, `barcode`, `cost_price`, `wholesale_price`, `stock_quantity`, `category`, `brand`, `location`, `unit`
- **Special Features**: 
  - Automatic SKU generation
  - Inventory integration for stock quantities
  - Price mapping (retail, wholesale, cost)
  - Category/unit/location resolution

### Contacts
- **Required Fields**: `name`, `type`
- **Optional Fields**: `email`, `phone`, `company`, `address`, `notes`
- **Special Features**:
  - Duplicate prevention by name
  - Type validation (customer, supplier, etc.)

### Categories
- **Required Fields**: `name`
- **Optional Fields**: `description`, `color`
- **Special Features**:
  - Duplicate prevention with fuzzy matching
  - Color support for UI customization

## Migration Rules

### SKU Generation (Products Only)
- **Format**: `{name_prefix}{timestamp}{random_suffix}`
- **Name Prefix**: First 3 alphanumeric characters of product name
- **Timestamp**: Last 4 digits of current timestamp
- **Random Suffix**: 3-digit random number (100-999)
- **Max Attempts**: 10 attempts for uniqueness
- **Fallback**: UUID-like suffix if all attempts fail

### Price Mapping (Products Only)
- `price` column maps to `retail_price` field
- `cost_price` maps to both `cost_price` and `purchase_price`
- `wholesale_price` maps to `wholesale_price` field
- All prices default to 0 if not provided

### Entity Resolution
- **Matching**: Exact name match (case-sensitive)
- **Filter**: Only active records (`is_active = true`)
- **Tenant**: Scoped to current tenant
- **Behavior**: Skip if not found (don't create automatically)

### Duplicate Prevention
- **Product Names**: Check for existing product with same name in tenant
- **Product SKUs**: Auto-generate new unique SKU if duplicate found
- **Contact Names**: Throw error if duplicate found
- **Category Names**: Check for exact and fuzzy matches

## Import Process

1. **File Validation**: Check CSV format and required headers
2. **Preview**: Show first 5 rows with validation status
3. **Processing**: Process each row individually with error handling
4. **Migration Tracking**: Create and update migration records
5. **Inventory Integration**: Create inventory transactions for products with stock
6. **Result Reporting**: Show success/failure counts and error details

## Export Process

1. **Data Retrieval**: Fetch all active records for selected entity type
2. **Related Data**: Include related information (categories, units, locations)
3. **CSV Generation**: Format data according to export field mappings
4. **File Download**: Generate and download CSV file with timestamp

## Error Handling

### Validation Errors
- Missing required fields
- Invalid file format
- Duplicate entries (where applicable)

### Processing Errors
- Database constraint violations
- Network connectivity issues
- Invalid data formats

### Recovery
- Partial imports supported (some records succeed, others fail)
- Detailed error reporting with row numbers
- Migration records track success/failure counts

## Security

### Tenant Isolation
- All operations scoped to current tenant
- RLS policies enforce tenant boundaries
- User authentication required for all operations

### Data Validation
- Input sanitization for all CSV data
- File type and size validation
- SQL injection prevention through parameterized queries

### Access Control
- Users can only access their tenant's data
- Migration history tracked per user
- Audit trail for all migration operations

## Performance

### Optimization Features
- Streaming CSV processing for large files
- Batch database operations where possible
- Caching for entity resolution
- Progress tracking for long operations

### Memory Management
- Process files in chunks to avoid memory issues
- Clear file references after processing
- Limit preview to first 5 rows

## Usage

### Import
1. Select entity type (products, contacts, categories)
2. Choose CSV file
3. Review preview and validation
4. Click "Import" to start processing
5. Monitor progress and review results

### Export
1. Select entity type
2. Click "Export" to generate CSV
3. File downloads automatically

### Templates
1. Click "Download Template" for selected entity type
2. Fill in sample data
3. Use as reference for import format

## Migration History

### Tracking Fields
- `tenant_id` - Tenant identifier
- `migration_type` - Import or export
- `file_name` - Original file name
- `total_records` - Total records processed
- `successful_records` - Successfully processed
- `failed_records` - Failed records
- `status` - Current migration status
- `error_message` - Error details if failed
- `created_at` - Migration start time
- `completed_at` - Migration completion time
- `created_by` - User who initiated migration

### Status Transitions
1. `pending` - Migration created
2. `processing` - Migration in progress
3. `completed` - Migration successful
4. `failed` - Migration failed
5. `partial` - Some records succeeded, others failed

## Best Practices

### Import Preparation
- Use provided templates as starting point
- Ensure all required fields are present
- Validate data formats (dates, numbers, etc.)
- Check for duplicate entries in source data
- Test with small files first

### Data Quality
- Use consistent naming conventions
- Validate email formats for contacts
- Ensure price values are numeric
- Check category/unit/location names match existing records

### Performance
- Split large imports into smaller files
- Process during off-peak hours
- Monitor system resources during large imports
- Use appropriate file sizes (recommended: < 10MB)

## Troubleshooting

### Common Issues
1. **Missing Required Fields**: Check CSV headers match template
2. **Duplicate Errors**: Review existing data before import
3. **Entity Resolution Failures**: Ensure categories/units/locations exist
4. **File Format Issues**: Use UTF-8 encoding, proper CSV format

### Error Recovery
1. Review error messages in results
2. Fix data issues in source file
3. Re-import with corrected data
4. Check migration history for details

## Future Enhancements

### Planned Features
- Bulk operations for multiple entity types
- Advanced validation rules
- Custom field mappings
- Scheduled imports/exports
- API endpoints for programmatic access
- Enhanced error recovery mechanisms


