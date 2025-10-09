// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, collection, doc, getDocs, getDoc, addDoc, setDoc, updateDoc, deleteDoc, query, orderBy, where, Timestamp, runTransaction } from 'firebase/firestore';
import { Product } from '@/types/product';

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAxxUwYK_qQuGr6PnQH8fdTm7GrwcZAwug",
  authDomain: "epic-electronics-274dd.firebaseapp.com",
  projectId: "epic-electronics-274dd",
  storageBucket: "epic-electronics-274dd.firebasestorage.app",
  messagingSenderId: "404096890819",
  appId: "1:404096890819:web:8d7d535ed494176c7c6f76",
  measurementId: "G-1M5F38XPKS"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);
export const db = getFirestore(app);

// Google Auth Provider
export const googleProvider = new GoogleAuthProvider();

// Configure Google Auth Provider
googleProvider.setCustomParameters({
  prompt: 'select_account',
  access_type: 'offline',
  include_granted_scopes: 'true'
});

// Add scopes if needed
googleProvider.addScope('profile');
googleProvider.addScope('email');

// Initialize Analytics only in production
let analytics;
if (typeof window !== 'undefined') {
  try {
    analytics = getAnalytics(app);
  } catch (error) {
    console.warn('Analytics initialization failed:', error);
  }
}

// Firebase Products Service
export class FirebaseProductsService {
  private collectionName = 'products';

  // Generate a URL-friendly slug from a product name
  private slugifyProductName(name: string): string {
    const maxWords = 25;
    const normalized = name
      .trim()
      // Replace underscores with spaces first
      .replace(/[_]+/g, ' ')
      // Collapse multiple whitespace
      .replace(/\s+/g, ' ');

    // Limit to first N words
    const words = normalized.split(' ').slice(0, maxWords);
    const limited = words.join(' ');

    // Convert to lowercase for consistency
    const lower = limited.toLowerCase();

    // Keep letters (including non-latin), numbers and spaces; replace others with a space
    const cleaned = lower.replace(/[^\p{L}\p{N}\s-]+/gu, ' ');

    // Replace spaces and consecutive dashes with single dash, and trim
    const dashed = cleaned
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');

    // Optionally cap total length for nicer URLs
    const maxLen = 120;
    return dashed.length > maxLen ? dashed.slice(0, maxLen).replace(/-+$/g, '') : dashed;
  }

  // Ensure unique slug by checking Firestore doc IDs and appending a counter if needed
  private async ensureUniqueSlug(baseSlug: string): Promise<string> {
    let candidate = baseSlug || 'product';
    let attempt = 1;

    // Check if a document with this ID already exists
    // Try a reasonable number of attempts to avoid infinite loops
    while (attempt <= 100) {
      const ref = doc(db, this.collectionName, candidate);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        return candidate;
      }
      attempt += 1;
      candidate = `${baseSlug}-${attempt}`;
    }
    // Fallback: timestamp-based suffix
    return `${baseSlug}-${Date.now().toString(36)}`;
  }

  // Get all products
  async getAllProducts(): Promise<Product[]> {
    try {
      const productsRef = collection(db, this.collectionName);
      const q = query(productsRef, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const products: Product[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        products.push({
          ...data,
          id: doc.id,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
          offerEndsAt: data.offerEndsAt?.toDate?.()?.toISOString() || data.offerEndsAt,
          expirationDate: data.expirationDate?.toDate?.()?.toISOString() || data.expirationDate,
        } as Product);
      });
      
      return products;
    } catch (error) {
      console.error('Error getting products:', error);
      throw error;
    }
  }

  // Get product by ID
  async getProductById(id: string): Promise<Product | null> {
    try {
      const docRef = doc(db, this.collectionName, id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          ...data,
          id: docSnap.id,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
          offerEndsAt: data.offerEndsAt?.toDate?.()?.toISOString() || data.offerEndsAt,
          expirationDate: data.expirationDate?.toDate?.()?.toISOString() || data.expirationDate,
        } as Product;
      } else {
        return null;
      }
    } catch (error) {
      console.error('Error getting product:', error);
      throw error;
    }
  }

  // Add new product
  async addProduct(product: Omit<Product, 'id'>): Promise<Product> {
    try {
      const productsRef = collection(db, this.collectionName);

      // Clean the product data by removing undefined values
      const cleanProduct = Object.fromEntries(
        Object.entries(product).filter(([_, value]) => value !== undefined)
      );
      
      // Convert dates to Firestore Timestamps
      const productData = {
        ...cleanProduct,
        createdAt: (cleanProduct as any).createdAt ? Timestamp.fromDate(new Date((cleanProduct as any).createdAt)) : Timestamp.now(),
        offerEndsAt: (cleanProduct as any).offerEndsAt ? Timestamp.fromDate(new Date((cleanProduct as any).offerEndsAt)) : null,
        expirationDate: (cleanProduct as any).expirationDate ? Timestamp.fromDate(new Date((cleanProduct as any).expirationDate)) : null,
      };

      // Build slug from product name and ensure uniqueness
      const baseSlug = this.slugifyProductName((cleanProduct as any).name || 'product');
      const uniqueSlug = await this.ensureUniqueSlug(baseSlug);

      // Create document with custom ID equal to the slug
      const docRef = doc(productsRef, uniqueSlug);
      await setDoc(docRef, productData);

      return {
        ...(cleanProduct as any),
        id: uniqueSlug,
      } as Product;
    } catch (error) {
      console.error('Error adding product:', error);
      throw error;
    }
  }

  // Update product
  async updateProduct(id: string, product: Partial<Product>): Promise<Product> {
    try {
      console.log(`Firebase: Updating product ${id} with data:`, product);
      const docRef = doc(db, this.collectionName, id);
      
      // Clean the product data by removing undefined values
      const cleanProduct = Object.fromEntries(
        Object.entries(product).filter(([_, value]) => value !== undefined)
      );
      
      // Convert dates to Firestore Timestamps
      const updateData: any = { ...cleanProduct };
      if ((cleanProduct as any).createdAt) {
        updateData.createdAt = Timestamp.fromDate(new Date((cleanProduct as any).createdAt));
      }
      if ((cleanProduct as any).offerEndsAt) {
        updateData.offerEndsAt = Timestamp.fromDate(new Date((cleanProduct as any).offerEndsAt));
      }
      if ((cleanProduct as any).expirationDate) {
        updateData.expirationDate = Timestamp.fromDate(new Date((cleanProduct as any).expirationDate));
      }
      
      console.log(`Firebase: Final update data:`, updateData);
      await updateDoc(docRef, updateData);
      console.log(`Firebase: Document updated successfully`);
      
      const updatedProduct = await this.getProductById(id) as Product;
      console.log(`Firebase: Retrieved updated product:`, updatedProduct);
      return updatedProduct;
    } catch (error) {
      console.error('Error updating product:', error);
      throw error;
    }
  }

  // Delete product
  async deleteProduct(id: string): Promise<void> {
    try {
      const docRef = doc(db, this.collectionName, id);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting product:', error);
      throw error;
    }
  }

  // Get products by category
  async getProductsByCategory(category: string): Promise<Product[]> {
    try {
      const productsRef = collection(db, this.collectionName);
      const q = query(
        productsRef, 
        where('category', '==', category),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      
      const products: Product[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        products.push({
          ...data,
          id: doc.id,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
          offerEndsAt: data.offerEndsAt?.toDate?.()?.toISOString() || data.offerEndsAt,
          expirationDate: data.expirationDate?.toDate?.()?.toISOString() || data.expirationDate,
        } as Product);
      });
      
      return products;
    } catch (error) {
      console.error('Error getting products by category:', error);
      throw error;
    }
  }

  // Get active products (not archived)
  async getActiveProducts(): Promise<Product[]> {
    try {
      const productsRef = collection(db, this.collectionName);
      const q = query(
        productsRef, 
        where('isArchived', '==', false),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      
      const products: Product[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        products.push({
          ...data,
          id: doc.id,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
          offerEndsAt: data.offerEndsAt?.toDate?.()?.toISOString() || data.offerEndsAt,
          expirationDate: data.expirationDate?.toDate?.()?.toISOString() || data.expirationDate,
        } as Product);
      });
      
      return products;
    } catch (error) {
      console.error('Error getting active products:', error);
      throw error;
    }
  }

  // Search products
  async searchProducts(searchTerm: string): Promise<Product[]> {
    try {
      const productsRef = collection(db, this.collectionName);
      const q = query(productsRef, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const products: Product[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const product = {
          ...data,
          id: doc.id,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
          offerEndsAt: data.offerEndsAt?.toDate?.()?.toISOString() || data.offerEndsAt,
          expirationDate: data.expirationDate?.toDate?.()?.toISOString() || data.expirationDate,
        } as Product;
        
        // Filter by search term
        if (
          product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          product.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
          product.description.toLowerCase().includes(searchTerm.toLowerCase())
        ) {
          products.push(product);
        }
      });
      
      return products;
    } catch (error) {
      console.error('Error searching products:', error);
      throw error;
    }
  }
}

// Create and export the products service instance
export const productsService = new FirebaseProductsService();

// Firebase Sales Service
export interface CashierSale {
  id: string;
  items: {
    product: {
      id: string;
      name: string;
      price: number;
      wholesaleInfo?: {
        purchasePrice: number;
        quantity: number;
      };
    };
    quantity: number;
    selectedSize?: {
      id: string;
      label: string;
      price: number;
    };
    selectedAddons: {
      id: string;
      label: string;
      price_delta: number;
    }[];
    unitFinalPrice: number;
    totalPrice: number;
  }[];
  totalAmount: number;
  timestamp: Date;
  customerName?: string;
}

export class FirebaseSalesService {
  private collectionName = 'cashier-sales';

  // Get all sales
  async getAllSales(): Promise<CashierSale[]> {
    try {
      const salesRef = collection(db, this.collectionName);
      const q = query(salesRef, orderBy('timestamp', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const sales: CashierSale[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        sales.push({
          ...data,
          id: doc.id,
          timestamp: data.timestamp?.toDate?.() || new Date(data.timestamp),
        } as CashierSale);
      });
      
      return sales;
    } catch (error) {
      console.error('Error getting sales:', error);
      throw error;
    }
  }

  // Add new sale
  async addSale(sale: Omit<CashierSale, 'id'>): Promise<CashierSale> {
    try {
      const salesRef = collection(db, this.collectionName);
      
      // Convert timestamp to Firestore Timestamp
      const saleData = {
        ...sale,
        timestamp: Timestamp.fromDate(sale.timestamp),
      };
      
      const docRef = await addDoc(salesRef, saleData);
      
      return {
        ...sale,
        id: docRef.id,
      } as CashierSale;
    } catch (error) {
      console.error('Error adding sale:', error);
      throw error;
    }
  }

  // Get sales by date range
  async getSalesByDateRange(startDate: Date, endDate: Date): Promise<CashierSale[]> {
    try {
      const salesRef = collection(db, this.collectionName);
      const q = query(
        salesRef,
        where('timestamp', '>=', Timestamp.fromDate(startDate)),
        where('timestamp', '<=', Timestamp.fromDate(endDate)),
        orderBy('timestamp', 'desc')
      );
      const querySnapshot = await getDocs(q);
      
      const sales: CashierSale[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        sales.push({
          ...data,
          id: doc.id,
          timestamp: data.timestamp?.toDate?.() || new Date(data.timestamp),
        } as CashierSale);
      });
      
      return sales;
    } catch (error) {
      console.error('Error getting sales by date range:', error);
      throw error;
    }
  }

  // Delete sale
  async deleteSale(id: string): Promise<void> {
    try {
      const docRef = doc(db, this.collectionName, id);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting sale:', error);
      throw error;
    }
  }

  // Clear all sales
  async clearAllSales(): Promise<void> {
    try {
      const salesRef = collection(db, this.collectionName);
      const querySnapshot = await getDocs(salesRef);
      
      const deletePromises = querySnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
    } catch (error) {
      console.error('Error clearing all sales:', error);
      throw error;
    }
  }
}

// Create and export the sales service instance
export const salesService = new FirebaseSalesService();

// Atomic quantity update interface
interface QuantityUpdate {
  productId: string;
  quantityToDeduct: number;
}

// Atomic quantity restore interface
interface QuantityRestore {
  productId: string;
  quantityToRestore: number;
}

// Atomic quantity update function for preventing race conditions
export const updateProductQuantitiesAtomically = async (updates: QuantityUpdate[]): Promise<void> => {
  return runTransaction(db, async (transaction) => {
    // First, read all product documents
    const productDocs = await Promise.all(
      updates.map(update => {
        const productRef = doc(db, 'products', update.productId);
        return transaction.get(productRef);
      })
    );

    // Check if all products exist and have sufficient quantities
    const updatedQuantities: { [key: string]: number } = {};
    
    for (let i = 0; i < updates.length; i++) {
      const update = updates[i];
      const productDoc = productDocs[i];
      
      if (!productDoc.exists()) {
        throw new Error(`المنتج ${update.productId} غير موجود`);
      }
      
      const productData = productDoc.data() as Product;
      const currentQuantity = productData.wholesaleInfo?.quantity || 0;
      const newQuantity = Math.max(0, currentQuantity - update.quantityToDeduct);
      
      if (currentQuantity < update.quantityToDeduct) {
        console.warn(`تحذير: الكمية المطلوبة (${update.quantityToDeduct}) أكبر من المتوفر (${currentQuantity}) للمنتج ${productData.name}`);
      }
      
      updatedQuantities[update.productId] = newQuantity;
    }

    // Now update all products atomically
    for (let i = 0; i < updates.length; i++) {
      const update = updates[i];
      const productDoc = productDocs[i];
      const productData = productDoc.data() as Product;
      const newQuantity = updatedQuantities[update.productId];
      
      const productRef = doc(db, 'products', update.productId);
      transaction.update(productRef, {
        'wholesaleInfo.quantity': newQuantity
      });
      
      console.log(`Transaction: تحديث المنتج ${productData.name} من ${productData.wholesaleInfo?.quantity || 0} إلى ${newQuantity}`);
    }
  });
};

// Atomic quantity restore function for restoring quantities back to products
export const restoreProductQuantitiesAtomically = async (restores: QuantityRestore[]): Promise<void> => {
  return runTransaction(db, async (transaction) => {
    // First, read all product documents
    const productDocs = await Promise.all(
      restores.map(restore => {
        const productRef = doc(db, 'products', restore.productId);
        return transaction.get(productRef);
      })
    );

    // Check if all products exist and calculate new quantities
    const updatedQuantities: { [key: string]: number } = {};
    
    for (let i = 0; i < restores.length; i++) {
      const restore = restores[i];
      const productDoc = productDocs[i];
      
      if (!productDoc.exists()) {
        throw new Error(`المنتج ${restore.productId} غير موجود`);
      }
      
      const productData = productDoc.data() as Product;
      const currentQuantity = productData.wholesaleInfo?.quantity || 0;
      const newQuantity = currentQuantity + restore.quantityToRestore;
      
      updatedQuantities[restore.productId] = newQuantity;
    }

    // Now update all products atomically
    for (let i = 0; i < restores.length; i++) {
      const restore = restores[i];
      const productDoc = productDocs[i];
      const productData = productDoc.data() as Product;
      const newQuantity = updatedQuantities[restore.productId];
      
      const productRef = doc(db, 'products', restore.productId);
      transaction.update(productRef, {
        'wholesaleInfo.quantity': newQuantity
      });
      
      console.log(`Transaction: استعادة المنتج ${productData.name} من ${productData.wholesaleInfo?.quantity || 0} إلى ${newQuantity}`);
    }
  });
};

export default app;