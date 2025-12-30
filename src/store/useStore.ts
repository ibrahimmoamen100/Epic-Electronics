import { create } from "zustand";
import { Product, Filter, CartItem, ProductSize, ProductAddon } from "@/types/product";
import { productsService, updateProductQuantitiesAtomically, restoreProductQuantitiesAtomically } from "@/lib/firebase";
import { persist } from "zustand/middleware";

// Helper function to calculate discounted price
const calculateDiscountedPrice = (product: Product): number => {
  if (product.specialOffer && product.offerEndsAt) {
    const now = new Date();
    const offerEndDate = new Date(product.offerEndsAt);

    // Check if offer is still active
    if (now < offerEndDate) {
      // Use discountPrice if available, otherwise fallback to percentage calculation
      if (product.discountPrice) {
        return product.discountPrice;
      } else if (product.discountPercentage) {
        return product.price - (product.price * product.discountPercentage) / 100;
      }
    }
  }
  return product.price;
};

interface StoreState {
  products: Product[];
  cart: CartItem[];
  filters: Filter;
  loading: boolean;
  error: string | null;
  setProducts: (products: Product[]) => void;
  addToCart: (product: Product, quantity?: number, selectedSize?: ProductSize | null, selectedAddons?: ProductAddon[], selectedColor?: string) => void;
  removeFromCart: (productId: string, selectedSizeId?: string | null) => void;
  updateCartItemQuantity: (productId: string, quantity: number, selectedSizeId?: string | null) => void;
  setFilters: (filters: Filter) => void;
  clearCart: (skipRestore?: boolean) => void;
  addProduct: (product: Omit<Product, 'id'>) => Promise<void>;
  updateProduct: (product: Product) => Promise<void>;
  deleteProduct: (productId: string) => Promise<void>;
  checkExpiredProducts: () => void;
  loadProducts: () => Promise<void>;
  searchProducts: (searchTerm: string) => Promise<Product[]>;
  getProductsByCategory: (category: string) => Promise<Product[]>;
  cleanCartFromDeletedProducts: () => void;
  getCartTotal: () => number;
  getCartItemPrice: (cartItem: CartItem) => number;
  updateProductQuantity: (productId: string, newQuantity: number) => Promise<void>;
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      products: [],
      cart: [],
      filters: {
        search: undefined,
        category: undefined,
        subcategory: undefined,
        brand: undefined,
        color: undefined,
        size: undefined,
        minPrice: undefined,
        maxPrice: undefined,
        supplier: undefined,
        processorName: undefined,
        dedicatedGraphicsName: undefined,
        hasDedicatedGraphics: undefined,
        screenSize: undefined,
        sortBy: undefined,
      },
      loading: false,
      error: null,
      setProducts: (products) => set({ products }),
      addToCart: async (product, quantity = 1, selectedSize = null, selectedAddons = [], selectedColor) => {
        // Check if product has wholesale info and available quantity
        const availableQuantity = product.wholesaleInfo?.quantity || 0;
        if (availableQuantity < quantity) {
          throw new Error(`الكمية المطلوبة غير متوفرة. المتوفر: ${availableQuantity}`);
        }

        // Calculate final price
        let unitFinalPrice = product.price;

        // If sizes are available and one is selected, use that price
        if (selectedSize) {
          unitFinalPrice = selectedSize.price;
        }

        // Add addon prices
        if (selectedAddons && selectedAddons.length > 0) {
          selectedAddons.forEach(addon => {
            unitFinalPrice += addon.price_delta;
          });
        }

        // Apply special offer discount if available
        if (product.specialOffer &&
          product.offerEndsAt &&
          new Date(product.offerEndsAt) > new Date()) {
          if (product.discountPrice) {
            // Use the discount price as recorded in admin
            unitFinalPrice = product.discountPrice;
          } else if (product.discountPercentage) {
            // Calculate discount if discountPrice is not available
            const discountAmount = (unitFinalPrice * product.discountPercentage) / 100;
            unitFinalPrice = unitFinalPrice - discountAmount;
          }
        }

        const totalPrice = unitFinalPrice * quantity;

        // Calculate new quantity after adding to cart
        const newQuantity = availableQuantity - quantity;

        set((state) => {
          // Filter out any invalid cart items first
          const validCart = state.cart.filter(item => item.product && item.product.id);

          // For products with sizes and colors, treat different combinations as different items
          const existingItem = validCart.find(
            (item) => item.product.id === product.id &&
              (selectedSize ? item.selectedSize?.id === selectedSize.id : !item.selectedSize) &&
              (selectedColor ? item.selectedColor === selectedColor : !item.selectedColor)
          );

          if (existingItem) {
            // Check if adding more quantity would exceed available stock
            const newTotalQuantity = existingItem.quantity + quantity;
            if (availableQuantity < newTotalQuantity) {
              throw new Error(`الكمية المطلوبة غير متوفرة. المتوفر: ${availableQuantity}`);
            }

            return {
              cart: validCart.map((item) =>
                item.product.id === product.id &&
                  (selectedSize ? item.selectedSize?.id === selectedSize.id : !item.selectedSize) &&
                  (selectedColor ? item.selectedColor === selectedColor : !item.selectedColor)
                  ? {
                    ...item,
                    quantity: item.quantity + quantity,
                    totalPrice: item.unitFinalPrice * (item.quantity + quantity)
                  }
                  : item
              ),
              // Update product quantity in products array
              products: state.products.map((p) =>
                p.id === product.id
                  ? {
                    ...p,
                    wholesaleInfo: p.wholesaleInfo
                      ? { ...p.wholesaleInfo, quantity: newQuantity }
                      : p.wholesaleInfo
                  }
                  : p
              ),
            };
          }

          // Create new cart item
          const newCartItem: CartItem = {
            product,
            quantity,
            selectedSize,
            selectedAddons: selectedAddons || [],
            selectedColor,
            unitFinalPrice,
            totalPrice
          };

          return {
            cart: [...validCart, newCartItem],
            // Update product quantity in products array
            products: state.products.map((p) =>
              p.id === product.id
                ? {
                  ...p,
                  wholesaleInfo: p.wholesaleInfo
                    ? { ...p.wholesaleInfo, quantity: newQuantity }
                    : p.wholesaleInfo
                }
                : p
            ),
          };
        });

        // Update Firebase using atomic transaction to prevent race conditions (async, don't await)
        updateProductQuantitiesAtomically([{
          productId: product.id,
          quantityToDeduct: quantity
        }]).catch(error => {
          console.error('Error updating product quantities in Firebase:', error);
          // Optionally show a toast or handle the error
        });

        // No need to reload products since we already updated the local state
      },
      removeFromCart: async (productId) => {
        const cartItem = get().cart.find((item) => item.product && item.product.id === productId);
        if (!cartItem) return;

        const product = get().products.find((p) => p.id === productId);
        if (!product) return;

        const availableQuantity = product.wholesaleInfo?.quantity || 0;
        const cartQuantity = cartItem.quantity;

        // Restore quantity using atomic transaction (async, don't await)
        restoreProductQuantitiesAtomically([{
          productId: productId,
          quantityToRestore: cartQuantity
        }]).catch(error => {
          console.error('Error restoring product quantities in Firebase:', error);
        });

        set((state) => {
          // Update local state with restored quantity
          const updatedProducts = state.products.map((p) =>
            p.id === productId
              ? {
                ...p,
                wholesaleInfo: p.wholesaleInfo
                  ? { ...p.wholesaleInfo, quantity: (p.wholesaleInfo.quantity || 0) + cartQuantity }
                  : p.wholesaleInfo
              }
              : p
          );

          return {
            cart: state.cart.filter((item) => item.product && item.product.id !== productId),
            products: updatedProducts
          };
        });

        // No need to reload products since we already updated the local state
      },
      updateCartItemQuantity: async (productId, quantity) => {
        const cartItem = get().cart.find((item) => item.product && item.product.id === productId);
        if (!cartItem) return;

        const product = get().products.find((p) => p.id === productId);
        if (!product) return;

        const availableQuantity = product.wholesaleInfo?.quantity || 0;
        const currentCartQuantity = cartItem.quantity;
        const quantityDifference = quantity - currentCartQuantity;

        // If reducing quantity, we can do it without checking
        if (quantityDifference <= 0) {
          if (quantity <= 0) {
            // Remove from cart and restore quantity locally (not in Firebase - will be updated when order is completed)
            const newQuantity = availableQuantity + currentCartQuantity;

            set((state) => ({
              cart: state.cart.filter((item) => item.product && item.product.id !== productId),
              // Restore the quantity to products array (local only)
              products: state.products.map((p) =>
                p.id === productId
                  ? {
                    ...p,
                    wholesaleInfo: p.wholesaleInfo
                      ? { ...p.wholesaleInfo, quantity: newQuantity }
                      : p.wholesaleInfo
                  }
                  : p
              ),
            }));
            return;
          }

          // Restore the difference to products array locally (not in Firebase)
          const newQuantity = availableQuantity + Math.abs(quantityDifference);

          set((state) => ({
            cart: state.cart.map((item) =>
              item.product && item.product.id === productId ? { ...item, quantity } : item
            ),
            // Restore the difference to products array (local only)
            products: state.products.map((p) =>
              p.id === productId
                ? {
                  ...p,
                  wholesaleInfo: p.wholesaleInfo
                    ? { ...p.wholesaleInfo, quantity: newQuantity }
                    : p.wholesaleInfo
                }
                : p
            ),
          }));
          return;
        }

        // If increasing quantity, check if we have enough stock
        if (availableQuantity < quantityDifference) {
          throw new Error(`الكمية المطلوبة غير متوفرة. المتوفر: ${availableQuantity}`);
        }

        // Reduce the quantity from products array locally (not in Firebase - will be updated when order is completed)
        const newQuantity = availableQuantity - quantityDifference;

        set((state) => ({
          cart: state.cart.map((item) =>
            item.product && item.product.id === productId ? { ...item, quantity } : item
          ),
          // Reduce the quantity from products array (local only)
          products: state.products.map((p) =>
            p.id === productId
              ? {
                ...p,
                wholesaleInfo: p.wholesaleInfo
                  ? { ...p.wholesaleInfo, quantity: newQuantity }
                  : p.wholesaleInfo
              }
              : p
          ),
        }));
      },
      setFilters: (filters) => set({ filters }),
      clearCart: async (skipRestore = false) => {
        const cart = get().cart;

        // Restore all quantities to Firebase only if not skipping (e.g., after order completion)
        if (!skipRestore) {
          for (const item of cart) {
            // Skip items with undefined or null product
            if (!item.product || !item.product.id) {
              continue;
            }
            const product = get().products.find((p) => p.id === item.product.id);
            if (product) {
              const currentQuantity = product.wholesaleInfo?.quantity || 0;
              const newQuantity = currentQuantity + item.quantity;

              await productsService.updateProduct(item.product.id, {
                ...product,
                wholesaleInfo: product.wholesaleInfo
                  ? { ...product.wholesaleInfo, quantity: newQuantity }
                  : product.wholesaleInfo
              });
            }
          }
        }

        set({ cart: [] });
      },
      getCartTotal: () => {
        const state = get();
        return state.cart
          .filter((item) => item.product && item.product.id) // Filter out invalid items
          .reduce((total, item) => {
            return total + item.totalPrice;
          }, 0);
      },
      getCartItemPrice: (cartItem: CartItem) => {
        return cartItem.unitFinalPrice;
      },
      addProduct: async (product) => {
        try {
          const newProduct = await productsService.addProduct(product);
          const products = get().products;
          set({ products: [newProduct, ...products], error: null });
        } catch (error) {
          console.error('Error adding product:', error);
          set({ error: 'فشل في إضافة المنتج' });
          throw error;
        }
      },
      updateProduct: async (updatedProduct) => {
        try {
          await productsService.updateProduct(updatedProduct.id, updatedProduct);
          const products = get().products;
          set({
            products: products.map((p) =>
              p.id === updatedProduct.id ? updatedProduct : p
            ),
            error: null,
          });
        } catch (error) {
          console.error('Error updating product:', error);
          set({ error: 'فشل في تحديث المنتج' });
          throw error;
        }
      },
      deleteProduct: async (productId) => {
        try {
          await productsService.deleteProduct(productId);
          const products = get().products;
          const cart = get().cart;

          // Remove the product from products array
          const updatedProducts = products.filter((p) => p.id !== productId);

          // Also remove the product from cart if it exists
          const updatedCart = cart.filter((item) => item.product && item.product.id !== productId);

          set({
            products: updatedProducts,
            cart: updatedCart,
            error: null,
          });
        } catch (error) {
          console.error('Error deleting product:', error);
          set({ error: 'فشل في حذف المنتج' });
          throw error;
        }
      },
      checkExpiredProducts: () => {
        const products = get().products;
        const now = new Date();
        const updatedProducts = products.map((product) => {
          if (
            product.expirationDate &&
            new Date(product.expirationDate) < now &&
            !product.isArchived
          ) {
            return { ...product, isArchived: true };
          }
          return product;
        });
        set({ products: updatedProducts });
      },
      loadProducts: async () => {
        set({ loading: true, error: null });
        try {
          const products = await productsService.getAllProducts();
          set({ products, error: null });

          // Clean cart from deleted products after loading
          setTimeout(() => {
            get().cleanCartFromDeletedProducts();
          }, 100);
        } catch (error) {
          console.error('Error loading products:', error);
          set({ error: 'فشل في تحميل المنتجات' });
        } finally {
          set({ loading: false });
        }
      },
      searchProducts: async (searchTerm: string) => {
        try {
          return await productsService.searchProducts(searchTerm);
        } catch (error) {
          console.error('Error searching products:', error);
          throw error;
        }
      },
      getProductsByCategory: async (category: string) => {
        try {
          return await productsService.getProductsByCategory(category);
        } catch (error) {
          console.error('Error getting products by category:', error);
          throw error;
        }
      },
      // Clean cart from deleted products
      cleanCartFromDeletedProducts: () => {
        const products = get().products;
        const cart = get().cart;

        // Remove cart items that reference deleted products or have undefined product
        const validCartItems = cart.filter((item) => {
          // Check if item.product exists and has an id
          if (!item.product || !item.product.id) {
            return false;
          }
          // Check if product still exists in products list
          return products.some((product) => product && product.id === item.product.id);
        });

        if (validCartItems.length !== cart.length) {
          set({ cart: validCartItems });
          console.log(`تم تنظيف ${cart.length - validCartItems.length} منتج محذوف من السلة`);
        }
      },
      updateProductQuantity: async (productId: string, newQuantity: number) => {
        try {
          const product = get().products.find(p => p.id === productId);
          if (!product) throw new Error('المنتج غير موجود');

          console.log(`Store: Updating product ${product.name} (${productId}) quantity from ${product.wholesaleInfo?.quantity || 0} to ${newQuantity}`);

          const updatedProduct = {
            ...product,
            wholesaleInfo: product.wholesaleInfo
              ? { ...product.wholesaleInfo, quantity: newQuantity }
              : product.wholesaleInfo
          };

          console.log('Store: Calling Firebase updateProduct...');
          await productsService.updateProduct(productId, updatedProduct);
          console.log('Store: Firebase updateProduct completed successfully');

          // Update local state
          const products = get().products;
          const updatedProducts = products.map((p) =>
            p.id === productId ? updatedProduct : p
          );
          set({
            products: updatedProducts,
          });
          console.log('Store: Local state updated successfully');
        } catch (error) {
          console.error('Error updating product quantity:', error);
          set({ error: 'فشل في تحديث كمية المنتج' });
          throw error;
        }
      },
    }),
    {
      name: "shop-storage",
      partialize: (state) => ({
        cart: state.cart,
      }),
    }
  )
);

// Check for expired products every minute
setInterval(() => {
  useStore.getState().checkExpiredProducts();
}, 60000);
