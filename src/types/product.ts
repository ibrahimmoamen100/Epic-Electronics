import { z } from "zod";

// Size schema for products
export const ProductSizeSchema = z.object({
  id: z.string(),
  label: z.string(),
  price: z.number(),
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
    cacheMemory: z.string().optional(), // Cache memory in MB
    baseClockSpeed: z.number().optional(), // Base clock speed in GHz
    maxTurboSpeed: z.number().optional(), // Max turbo speed in GHz
    cores: z.number().optional(), // Number of cores
    threads: z.number().optional(), // Number of threads
    integratedGraphics: z.string().optional(), // Integrated graphics
  }).optional(),
  // Dedicated Graphics Card specifications
  dedicatedGraphics: z.object({
    hasDedicatedGraphics: z.boolean().optional(), // Whether the product has dedicated graphics
    name: z.string().optional(), // Graphics card name/model
    manufacturer: z.string().optional(), // Manufacturer (NVIDIA, AMD, etc.)
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
  dedicatedGraphicsName: z.string().optional(),
  hasDedicatedGraphics: z.boolean().optional(),
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
