import { z } from 'zod';
import { isValidBarcode } from './barcode';

// Product Schema - Comprehensive validation for products
export const productSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Product name is required").max(255, "Product name must be less than 255 characters"),
  sku: z.string().min(1, "SKU is required").max(100, "SKU must be less than 100 characters"),
  description: z.string().optional(),
  wholesale_price: z.coerce.number().min(0, "Wholesale price must be non-negative").default(0),
  retail_price: z.coerce.number().min(0, "Retail price must be non-negative").default(0),
  cost_price: z.coerce.number().min(0, "Cost price must be non-negative").default(0),
  purchase_price: z.coerce.number().min(0, "Purchase price must be non-negative").default(0),
  default_profit_margin: z.coerce.number().min(0, "Profit margin must be non-negative").max(100, "Profit margin cannot exceed 100%").default(0),
  barcode: z.string().optional().nullable().refine(
    (val) => isValidBarcode(val || ''),
    { message: "Barcode format is invalid. Use only letters, numbers, hyphens, and underscores." }
  ),
  category_id: z.string().min(1, "Category is required"),
  subcategory_id: z.string().optional().nullable(),
  brand_id: z.string().optional().nullable(),
  unit_id: z.string().optional().nullable(),
  stock_quantity: z.coerce.number().min(0, "Stock quantity must be non-negative").default(0),
  min_stock_level: z.coerce.number().min(0, "Minimum stock level must be non-negative").default(0),
  has_expiry_date: z.boolean().default(false),
  is_active: z.boolean().default(true),
  location_id: z.string().optional().nullable(),
  image_url: z.string().optional().nullable(),
});

// Brand Schema - Following the pattern from BrandManagement
export const brandSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Brand name is required").max(255, "Brand name must be less than 255 characters"),
  description: z.string().optional(),
  logo_url: z.string().optional(),
  is_active: z.boolean().default(true),
});

// Unit Schema - Following the pattern from UnitsManagement
export const unitSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Name is required").max(255, "Name must be less than 255 characters"),
  abbreviation: z.string().min(1, "Abbreviation is required").max(10, "Abbreviation must be less than 10 characters"),
  code: z.string().min(1, "Code is required").max(20, "Code must be less than 20 characters"),
  is_base_unit: z.boolean().default(false),
  base_unit_id: z.string().nullable().optional(),
  conversion_factor: z.coerce.number().positive("Conversion factor must be positive").default(1),
  is_active: z.boolean().default(true),
});

// Category Schema
export const categorySchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Category name is required").max(255, "Category name must be less than 255 characters"),
  description: z.string().optional(),
  is_active: z.boolean().default(true),
});

// Subcategory Schema
export const subcategorySchema = z.object({
  id: z.string().uuid().optional(),
  tenant_id: z.string().uuid(),
  category_id: z.string().uuid(),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional().nullable(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

// Product Variant Schema
export const productVariantSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Variant name is required").max(255, "Variant name must be less than 255 characters"),
  value: z.string().min(1, "Variant value is required").max(255, "Variant value must be less than 255 characters"),
  sku: z.string().min(1, "Variant SKU is required").max(100, "Variant SKU must be less than 100 characters"),
  price_adjustment: z.coerce.number().default(0),
  stock_quantity: z.coerce.number().min(0, "Stock quantity must be non-negative").default(0),
  cost_price: z.coerce.number().min(0, "Cost price must be non-negative").default(0),
  wholesale_price: z.coerce.number().min(0, "Wholesale price must be non-negative").default(0),
  retail_price: z.coerce.number().min(0, "Retail price must be non-negative").default(0),
  image_url: z.string().optional(),
  is_active: z.boolean().default(true),
});

// Stock Adjustment Schema
export const stockAdjustmentSchema = z.object({
  id: z.string().optional(),
  product_id: z.string().min(1, "Product is required"),
  adjustment_type: z.enum(["in", "out", "correction"]),
  quantity: z.coerce.number().positive("Quantity must be positive"),
  reason: z.string().min(1, "Reason is required").max(500, "Reason must be less than 500 characters"),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

// Stock Transfer Schema
export const stockTransferSchema = z.object({
  id: z.string().optional(),
  from_location_id: z.string().min(1, "Source location is required"),
  to_location_id: z.string().min(1, "Destination location is required"),
  product_id: z.string().min(1, "Product is required"),
  quantity: z.coerce.number().positive("Quantity must be positive"),
  status: z.enum(["pending", "in_transit", "completed", "cancelled"]).default("pending"),
  notes: z.string().optional(),
});

// Business Settings Schema
export const businessSettingsSchema = z.object({
  id: z.string().optional(),
  enableProductUnits: z.boolean().default(false),
  enableProductBrands: z.boolean().default(false),
  enableProductVariants: z.boolean().default(false),
  enableProductExpiry: z.boolean().default(false),
  enableNegativeStock: z.boolean().default(false),
  enableComboProducts: z.boolean().default(false),
  defaultCurrency: z.string().min(1, "Default currency is required"),
  defaultTaxRate: z.coerce.number().min(0, "Tax rate must be non-negative").max(100, "Tax rate cannot exceed 100%").default(0),
  lowStockThreshold: z.coerce.number().min(0, "Low stock threshold must be non-negative").default(10),
});

// Type exports
export type ProductFormData = z.infer<typeof productSchema>;
export type BrandFormData = z.infer<typeof brandSchema>;
export type UnitFormData = z.infer<typeof unitSchema>;
export type CategoryFormData = z.infer<typeof categorySchema>;
export type SubcategoryFormData = z.infer<typeof subcategorySchema>;
export type ProductVariantFormData = z.infer<typeof productVariantSchema>;
export type StockAdjustmentFormData = z.infer<typeof stockAdjustmentSchema>;
export type StockTransferFormData = z.infer<typeof stockTransferSchema>;
export type BusinessSettingsFormData = z.infer<typeof businessSettingsSchema>;

// Validation helper functions
export const validateProduct = (data: any) => {
  try {
    return { success: true, data: productSchema.parse(data) };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, errors: error.errors };
    }
    return { success: false, errors: [{ message: "Unknown validation error" }] };
  }
};

export const validateBrand = (data: any) => {
  try {
    return { success: true, data: brandSchema.parse(data) };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, errors: error.errors };
    }
    return { success: false, errors: [{ message: "Unknown validation error" }] };
  }
};

export const validateUnit = (data: any) => {
  try {
    return { success: true, data: unitSchema.parse(data) };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, errors: error.errors };
    }
    return { success: false, errors: [{ message: "Unknown validation error" }] };
  }
};
