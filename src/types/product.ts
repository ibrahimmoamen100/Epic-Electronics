import { z } from "zod";

// Size schema for products
export const ProductSizeSchema = z.object({
  id: z.string(),
  label: z.string(),
  extraPrice: z.number().optional().default(0), // Extra cost added to base price
  price: z.number(), // Final price (Base + Extra)
});

// Addon schema for products
export const ProductAddonSchema = z.object({
  id: z.string(),
  label: z.string(),
  price_delta: z.number(), // Additional price to add to base price
});

export const ProductSchema = z.object({
  id: z.string(),
  name: z.string(),
  brand: z.string(),
  price: z.number(), // Base price when no sizes are defined
  category: z.string(),
  subcategory: z.string().optional(),
  merchant: z.string().optional(),
  color: z.string(),
  size: z.string(),
  images: z.array(z.string()),
  description: z.string(),
  specialOffer: z.boolean().optional().default(false),
  discountPercentage: z.number().optional(),
  discountPrice: z.number().optional(),
  offerEndsAt: z.string().optional(),
  isArchived: z.boolean(),
  createdAt: z
    .string()
    .optional()
    .default(() => new Date().toISOString()),
  expirationDate: z.string().optional(),
  // New fields for sizes and addons
  sizes: z.array(ProductSizeSchema).optional().default([]),
  addons: z.array(ProductAddonSchema).optional().default([]),
  costs: z.object({
    base_cost: z.number().optional(), // Base cost for profit calculation
  }).optional(),
  // Processor specifications
  processor: z.object({
    name: z.string().optional(), // Processor name (e.g., "Intel Core i7-12700K")
    processorBrand: z.enum(["Intel", "AMD", "Other"]).optional(), // Processor brand
    processorGeneration: z.string().optional(), // Processor generation (e.g., "الجيل السابع", "7th Gen")
    processorSeries: z.string().optional(), // Processor series (e.g., "Intel Core i7", "AMD Ryzen 5")
    cacheMemory: z.string().optional(), // Cache memory in MB
    baseClockSpeed: z.number().optional(), // Base clock speed in GHz
    maxTurboSpeed: z.number().optional(), // Max turbo speed in GHz
    cores: z.number().optional(), // Number of cores
    threads: z.number().optional(), // Number of threads
    integratedGraphics: z.string().optional(), // Integrated graphics (deprecated, use integratedGpu)
    integratedGpu: z.string().optional(), // Integrated GPU type
  }).optional(),
  // Dedicated Graphics Card specifications
  dedicatedGraphics: z.object({
    hasDedicatedGraphics: z.boolean().optional(), // Whether the product has dedicated graphics
    name: z.string().optional(), // Graphics card name/model (deprecated, use dedicatedGpuModel)
    manufacturer: z.string().optional(), // Manufacturer (deprecated, use dedicatedGpuBrand)
    dedicatedGpuBrand: z.enum(["NVIDIA", "AMD", "Intel", "Custom"]).optional(), // GPU brand
    dedicatedGpuModel: z.string().optional(), // GPU model (e.g., "RTX 3050", "GTX 1650")
    vram: z.number().optional(), // VRAM in GB
    memoryType: z.string().optional(), // Memory type (GDDR6, GDDR6X, etc.)
    memorySpeed: z.number().optional(), // Memory speed in MHz
    memoryBusWidth: z.number().optional(), // Memory bus width in bits
    baseClock: z.number().optional(), // Base clock in MHz
    boostClock: z.number().optional(), // Boost clock in MHz
    powerConsumption: z.number().optional(), // Power consumption in Watts
    powerConnectors: z.array(z.string()).optional(), // Power connectors required
    availablePorts: z.array(z.string()).optional(), // Available ports
    gamingTechnologies: z.array(z.string()).optional(), // Gaming technologies supported
  }).optional(),
  display: z.object({
    sizeInches: z.number().optional(), // Screen size in inches
    resolution: z.string().optional(), // e.g., Full HD, 4K
    panelType: z.string().optional(), // IPS, VA, TN, OLED, etc.
    refreshRate: z.number().optional(), // Refresh rate in Hz
  }).optional(),
  wholesaleInfo: z
    .object({
      supplierName: z.string(),
      supplierPhone: z.string(),
      supplierEmail: z.string(),
      supplierLocation: z.string(),
      purchasePrice: z.number(),
      purchasedQuantity: z.number(), // Changed from minimumOrderQuantity
      quantity: z.number(),
      notes: z.string().optional(),
    })
    .optional(),
});

export type Product = z.infer<typeof ProductSchema>;
export type ProductSize = z.infer<typeof ProductSizeSchema>;
export type ProductAddon = z.infer<typeof ProductAddonSchema>;

export const FilterSchema = z.object({
  search: z.string().optional(),
  category: z.string().optional(),
  subcategory: z.string().optional(),
  brand: z.string().optional(),
  color: z.string().optional(),
  size: z.string().optional(),
  minPrice: z.number().optional(),
  maxPrice: z.number().optional(),
  supplier: z.string().optional(),
  processorName: z.string().optional(),
  processorBrand: z.array(z.enum(["Intel", "AMD", "Other"])).optional(), // Multiple selection
  processorGeneration: z.array(z.string()).optional(), // Multiple selection
  processorSeries: z.array(z.string()).optional(), // Multiple selection
  integratedGpu: z.array(z.string()).optional(), // Multiple selection
  dedicatedGraphicsName: z.string().optional(),
  dedicatedGpuBrand: z.array(z.enum(["NVIDIA", "AMD", "Intel", "Custom"])).optional(), // Multiple selection
  dedicatedGpuModel: z.array(z.string()).optional(), // Multiple selection
  hasDedicatedGraphics: z.boolean().optional(),
  screenSize: z.string().optional(),
  sortBy: z
    .enum(["price-asc", "price-desc", "name-asc", "name-desc"])
    .optional(),
});

export type Filter = z.infer<typeof FilterSchema>;

// Cart item with selected options
export interface CartItem {
  product: Product;
  quantity: number;
  selectedSize?: ProductSize; // Selected size option
  selectedAddons: ProductAddon[]; // Selected addons
  selectedColor?: string; // Selected color
  unitFinalPrice: number; // Final calculated price per unit
  totalPrice: number; // Final total price (unitFinalPrice * quantity)
}
