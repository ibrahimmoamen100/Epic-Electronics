import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

export interface AdminCredentials {
  password: string;
  role: 'admin';
  createdAt: Date;
  lastLogin: Date;
  isActive: boolean;
}

export interface AdminSession {
  token: string;
  expiresAt: Date;
  isAuthenticated: boolean;
}

class AdminAuthService {
  private readonly ADMIN_COLLECTION = 'admin_config';
  private readonly SESSION_COOKIE_NAME = 'admin_session_token';
  private readonly SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

  // Generate a secure random token
  private generateToken(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    const token = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    console.log('🔐 AdminAuth: Generated token length:', token.length);
    return token;
  }

  // Set session token in localStorage
  private setSessionToken(token: string, expiresIn: number): void {
    const expires = new Date(Date.now() + expiresIn);
    const sessionData = {
      token,
      expiresAt: expires.toISOString()
    };
    
    try {
      localStorage.setItem(this.SESSION_COOKIE_NAME, JSON.stringify(sessionData));
      console.log('💾 Session token saved to localStorage:', token);
      console.log('💾 Expires at:', expires.toISOString());
      
      // Verify the token was saved correctly
      const savedData = localStorage.getItem(this.SESSION_COOKIE_NAME);
      console.log('💾 Verification - saved data exists:', !!savedData);
      if (savedData) {
        const parsed = JSON.parse(savedData);
        console.log('💾 Verification - saved token matches:', parsed.token === token);
      }
    } catch (error) {
      console.error('💾 Error saving session token to localStorage:', error);
    }
  }

  // Get session token from localStorage
  private getSessionToken(): string | null {
    try {
      const sessionData = localStorage.getItem(this.SESSION_COOKIE_NAME);
      console.log('💾 getSessionToken: localStorage data exists:', !!sessionData);
      
      if (!sessionData) {
        console.log('💾 No session data found in localStorage');
        return null;
      }

      const parsed = JSON.parse(sessionData);
      console.log('💾 getSessionToken: parsed data:', {
        hasToken: !!parsed.token,
        expiresAt: parsed.expiresAt,
        currentTime: new Date().toISOString()
      });
      
      const expiresAt = new Date(parsed.expiresAt);
      
      if (new Date() > expiresAt) {
        console.log('💾 Session token expired, removing from localStorage');
        this.deleteSessionToken();
        return null;
      }

      console.log('💾 Session token found in localStorage:', parsed.token);
      return parsed.token;
    } catch (error) {
      console.error('💾 Error reading session token from localStorage:', error);
      this.deleteSessionToken();
      return null;
    }
  }

  // Delete session token from localStorage
  private deleteSessionToken(): void {
    try {
      const beforeDelete = localStorage.getItem(this.SESSION_COOKIE_NAME);
      console.log('💾 Before delete - session exists:', !!beforeDelete);
      
      localStorage.removeItem(this.SESSION_COOKIE_NAME);
      
      const afterDelete = localStorage.getItem(this.SESSION_COOKIE_NAME);
      console.log('💾 After delete - session exists:', !!afterDelete);
      console.log('💾 Session token removed from localStorage');
    } catch (error) {
      console.error('💾 Error deleting session token:', error);
    }
  }


  // Get admin configuration from Firebase only (no localStorage fallback for security)
  private async getAdminConfig(): Promise<AdminCredentials | null> {
    console.log('🔍 AdminAuth: Getting admin config from Firebase only...');
    
    try {
      console.log('🔍 AdminAuth: Collection:', this.ADMIN_COLLECTION);
      console.log('🔍 AdminAuth: Document ID: admin');
      
      const adminDocRef = doc(db, this.ADMIN_COLLECTION, 'admin');
      console.log('🔍 AdminAuth: Document reference created');
      
      const adminDoc = await getDoc(adminDocRef);
      console.log('🔍 AdminAuth: Document fetched, exists:', adminDoc.exists());
      
      if (adminDoc.exists()) {
        console.log('✅ AdminAuth: Found admin config in Firebase');
        const data = adminDoc.data() as any;
        console.log('🔍 AdminAuth: Firebase data (raw):', { ...data, password: '[HIDDEN]' }); // Hide password in logs
        
        // Ensure password is a string (Firebase might store it as number)
        // Handle both string and number types
        let passwordValue = data.password;
        if (typeof passwordValue === 'number') {
          passwordValue = passwordValue.toString();
        } else if (passwordValue === null || passwordValue === undefined) {
          passwordValue = '';
        } else {
          passwordValue = String(passwordValue);
        }
        
        const normalizedData: AdminCredentials = {
          ...data,
          password: passwordValue.trim(),
          role: data.role || 'admin',
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt || Date.now()),
          lastLogin: data.lastLogin?.toDate ? data.lastLogin.toDate() : new Date(data.lastLogin || Date.now()),
          isActive: data.isActive !== undefined ? Boolean(data.isActive) : true,
        };
        
        console.log('🔍 AdminAuth: Firebase data (normalized):', { ...normalizedData, password: '[HIDDEN]' }); // Hide password in logs
        console.log('🔍 AdminAuth: Password from Firebase:', {
          raw: typeof data.password,
          type: typeof data.password,
          normalized: typeof normalizedData.password,
          normalizedType: typeof normalizedData.password,
          length: normalizedData.password.length
        });
        
        return normalizedData;
      } else {
        console.log('ℹ️ AdminAuth: No admin config found in Firebase');
        return null;
      }
    } catch (error: any) {
      console.error('❌ AdminAuth: Firebase access failed:', {
        name: error?.name,
        message: error?.message,
        code: error?.code
      });
      
      // If it's a permissions error, log a helpful message
      if (error?.code === 'permission-denied') {
        console.error('❌ AdminAuth: Permission denied. Please update Firebase Rules:');
        console.error('❌ AdminAuth: Go to Firebase Console > Firestore > Rules');
        console.error('❌ AdminAuth: Add this rule:');
        console.error('❌ AdminAuth: match /admin_config/{document} {');
        console.error('❌ AdminAuth:   allow read, write: if true;');
        console.error('❌ AdminAuth: }');
      }
      
      // Do not fallback to localStorage for security reasons
      return null;
    }
  }

  // Initialize admin configuration in Firebase only (no localStorage for security)
  async initializeAdminConfig(): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('🔧 AdminAuth: Initializing admin configuration in Firebase only...');
      
      try {
        const adminDoc = await getDoc(doc(db, this.ADMIN_COLLECTION, 'admin'));
        if (adminDoc.exists()) {
          console.log('✅ AdminAuth: Admin configuration already exists in Firebase');
          return { success: true, error: 'Admin configuration already exists' };
        }

        console.log('❌ AdminAuth: No admin configuration found in Firebase');
        console.log('❌ AdminAuth: Cannot create admin configuration without Firebase access');
        return { 
          success: false, 
          error: 'Admin configuration must be created in Firebase. Please create it manually in Firebase Console.' 
        };
      } catch (firebaseError: any) {
        console.error('❌ AdminAuth: Firebase initialization failed:', firebaseError);
        console.error('❌ AdminAuth: Firebase error details:', firebaseError.message);
        return { 
          success: false, 
          error: `Failed to access Firebase: ${firebaseError.message || 'Unknown error'}. Please check Firebase permissions.` 
        };
      }
    } catch (error: any) {
      console.error('❌ AdminAuth: Error initializing admin config:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to initialize admin configuration' 
      };
    }
  }

  // Admin login
  async login(password: string): Promise<{ success: boolean; error?: string; session?: AdminSession }> {
    try {
      console.log('🔐 AdminAuth: Starting login...');
      console.log('🔐 AdminAuth: Input password:', password);
      
      // Get admin configuration (try Firebase first, then local)
      console.log('🔐 AdminAuth: Getting admin config...');
      let adminData = await this.getAdminConfig();
      
      if (!adminData) {
        console.log('❌ AdminAuth: Admin config not found in Firebase');
        // Check if it's a permissions error
        try {
          const testDoc = await getDoc(doc(db, this.ADMIN_COLLECTION, 'admin'));
          if (!testDoc.exists()) {
            return { 
              success: false, 
              error: 'إعدادات الإدارة غير موجودة في Firebase. يرجى إنشاء الوثيقة في Firebase Console:\n- Collection: admin_config\n- Document: admin\n- Fields: password (string), role (string), isActive (boolean), createdAt (timestamp), lastLogin (timestamp)' 
            };
          }
        } catch (permError: any) {
          if (permError?.code === 'permission-denied') {
            return { 
              success: false, 
              error: 'خطأ في صلاحيات Firebase. يرجى تحديث قواعد Firebase في Firebase Console:\n\n1. اذهب إلى Firestore > Rules\n2. أضف هذه القاعدة:\n\nmatch /admin_config/{document} {\n  allow read, write: if true;\n}\n\n3. اضغط "Publish"' 
            };
          }
        }
        return { 
          success: false, 
          error: 'إعدادات الإدارة غير موجودة في Firebase. يرجى التحقق من Firebase Console.' 
        };
      }
      
      console.log('🔐 AdminAuth: Admin data retrieved:', {
        password: '[HIDDEN]', // Hide password in logs for security
        isActive: adminData.isActive,
        role: adminData.role
      });
      
      if (!adminData.isActive) {
        console.log('🔐 AdminAuth: Admin account is deactivated');
        return { success: false, error: 'حساب الإدارة معطل' };
      }
      
      // Check password - normalize both passwords for comparison
      console.log('🔐 AdminAuth: Comparing passwords...');
      
      // Normalize passwords: trim whitespace and ensure both are strings
      const normalizedInputPassword = String(password || '').trim();
      const normalizedStoredPassword = String(adminData.password || '').trim();
      
      console.log('🔐 AdminAuth: Input password (raw):', `"${password}"`);
      console.log('🔐 AdminAuth: Input password (normalized):', `"${normalizedInputPassword}"`);
      console.log('🔐 AdminAuth: Stored password (raw):', `"${adminData.password}"`);
      console.log('🔐 AdminAuth: Stored password (normalized):', `"${normalizedStoredPassword}"`);
      console.log('🔐 AdminAuth: Input password type:', typeof password);
      console.log('🔐 AdminAuth: Stored password type:', typeof adminData.password);
      console.log('🔐 AdminAuth: Input password length:', normalizedInputPassword.length);
      console.log('🔐 AdminAuth: Stored password length:', normalizedStoredPassword.length);
      console.log('🔐 AdminAuth: Passwords match:', normalizedInputPassword === normalizedStoredPassword);
      
      if (normalizedInputPassword !== normalizedStoredPassword) {
        console.log('❌ AdminAuth: Invalid password');
        console.log('❌ AdminAuth: Password mismatch details:', {
          input: normalizedInputPassword,
          stored: normalizedStoredPassword,
          inputLength: normalizedInputPassword.length,
          storedLength: normalizedStoredPassword.length,
          inputCharCodes: normalizedInputPassword.split('').map(c => c.charCodeAt(0)),
          storedCharCodes: normalizedStoredPassword.split('').map(c => c.charCodeAt(0))
        });
        return { success: false, error: 'كلمة المرور غير صحيحة' };
      }
      
      console.log('✅ AdminAuth: Password verified successfully');
      
      // Update last login in Firebase only
      console.log('🔐 AdminAuth: Updating last login in Firebase...');
      const updateData = {
        ...adminData,
        lastLogin: new Date(),
      };
      
      try {
        // Update in Firebase only (no localStorage for security)
        await setDoc(doc(db, this.ADMIN_COLLECTION, 'admin'), updateData, { merge: true });
        console.log('✅ AdminAuth: Last login updated in Firebase successfully');
      } catch (firebaseError: any) {
        console.warn('⚠️ AdminAuth: Failed to update last login in Firebase:', firebaseError?.message || firebaseError);
        // Do not fallback to localStorage for security reasons
        // Continue with login anyway
      }

      // Generate session token
      console.log('🔐 AdminAuth: Generating session token...');
      const token = this.generateToken();
      const expiresAt = new Date(Date.now() + this.SESSION_DURATION);
      console.log('🔐 AdminAuth: Token generated:', token);
      console.log('🔐 AdminAuth: Expires at:', expiresAt.toISOString());

      const session: AdminSession = {
        token,
        expiresAt,
        isAuthenticated: true,
      };
      console.log('🔐 AdminAuth: Session object created:', session);

      // Store session in Firestore (optional - if it fails, continue anyway)
      console.log('🔐 AdminAuth: Attempting to store session in Firestore...');
      const sessionData = {
        ...session,
        createdAt: new Date(),
      };
      console.log('🔐 AdminAuth: Session data to store:', sessionData);
      
      try {
        await setDoc(doc(db, 'admin_sessions', token), sessionData);
        console.log('✅ AdminAuth: Session stored in Firestore successfully');
      } catch (firestoreError: any) {
        console.warn('⚠️ AdminAuth: Failed to store session in Firestore (continuing anyway):', firestoreError?.message || firestoreError);
        console.warn('⚠️ AdminAuth: Session will be stored locally only');
        // Continue - session will be stored locally
      }

      // Set session token
      this.setSessionToken(token, this.SESSION_DURATION);
      console.log('🔐 AdminAuth: Login successful, session token saved');
      console.log('🔐 AdminAuth: Session created:', session);
      
      // Verify session token was saved
      const savedToken = this.getSessionToken();
      console.log('🔐 AdminAuth: Verification - saved token:', savedToken);
      console.log('🔐 AdminAuth: Verification - expected token:', token);
      console.log('🔐 AdminAuth: Verification - tokens match:', savedToken === token);
      
      // Additional verification
      if (savedToken !== token) {
        console.error('🔐 AdminAuth: CRITICAL - Token mismatch after save!');
        console.error('🔐 AdminAuth: Expected:', token);
        console.error('🔐 AdminAuth: Got:', savedToken);
      } else {
        console.log('🔐 AdminAuth: Token verification successful');
      }
      
      // Verify session exists in Firestore
      try {
        const verifySessionDoc = await getDoc(doc(db, 'admin_sessions', token));
        console.log('🔐 AdminAuth: Firestore verification - session exists:', verifySessionDoc.exists());
        if (verifySessionDoc.exists()) {
          const verifyData = verifySessionDoc.data();
          console.log('🔐 AdminAuth: Firestore verification - session data:', {
            token: verifyData.token,
            isAuthenticated: verifyData.isAuthenticated,
            expiresAt: verifyData.expiresAt
          });
        }
      } catch (error) {
        console.error('🔐 AdminAuth: Error verifying session in Firestore:', error);
      }

      return { success: true, session };
    } catch (error: any) {
      console.error('❌ AdminAuth: Login error caught:', error);
      console.error('❌ AdminAuth: Error name:', error?.name);
      console.error('❌ AdminAuth: Error message:', error?.message);
      console.error('❌ AdminAuth: Error stack:', error?.stack);
      console.error('❌ AdminAuth: Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
      
      // Return more specific error message
      const errorMessage = error?.message || 'فشل في تسجيل الدخول';
      return { success: false, error: errorMessage };
    }
  }

  // Verify admin session
  async verifySession(): Promise<{ success: boolean; session?: AdminSession; error?: string }> {
    try {
      console.log('🔍 AdminAuth: Verifying session...');
      const token = this.getSessionToken();
      console.log('🔍 AdminAuth: Token from localStorage:', token ? 'exists' : 'not found');
      console.log('🔍 AdminAuth: Token value:', token);
      
      if (!token) {
        console.log('🔍 AdminAuth: No token found, returning error');
        return { success: false, error: 'No session token found' };
      }

      // Check if session exists in Firestore (optional - if not found, use localStorage)
      console.log('🔍 AdminAuth: Checking session in Firestore...');
      let sessionData: AdminSession | null = null;
      
      try {
        const sessionDoc = await getDoc(doc(db, 'admin_sessions', token));
        console.log('🔍 AdminAuth: Session document exists in Firestore:', sessionDoc.exists());
        
        if (sessionDoc.exists()) {
          sessionData = sessionDoc.data() as AdminSession;
          console.log('🔍 AdminAuth: Session data retrieved from Firestore');
        } else {
          console.log('🔍 AdminAuth: Session not found in Firestore, will use localStorage');
        }
      } catch (firestoreError: any) {
        console.warn('⚠️ AdminAuth: Failed to check session in Firestore (will use localStorage):', firestoreError?.message || firestoreError);
      }
      
      // If session not in Firestore, create from localStorage token
      if (!sessionData) {
        console.log('🔍 AdminAuth: Creating session from localStorage token');
        const expiresAt = new Date(Date.now() + this.SESSION_DURATION);
        sessionData = {
          token,
          expiresAt,
          isAuthenticated: true,
        };
        console.log('🔍 AdminAuth: Session created from localStorage:', sessionData);
      }
      console.log('🔍 AdminAuth: Session data retrieved:', {
        token: sessionData.token,
        isAuthenticated: sessionData.isAuthenticated,
        expiresAt: sessionData.expiresAt
      });
      
      // Check if session is expired - Handle different timestamp formats
      const now = new Date();
      let expiresAt: Date;
      
      try {
        const expiresAtValue = sessionData.expiresAt as any;
        
        if (expiresAtValue instanceof Date) {
          expiresAt = expiresAtValue;
        } else if (expiresAtValue && typeof expiresAtValue.toDate === 'function') {
          // Firebase Timestamp
          expiresAt = expiresAtValue.toDate();
        } else if (expiresAtValue && typeof expiresAtValue === 'object' && expiresAtValue.seconds) {
          // Firebase Timestamp object
          expiresAt = new Date(expiresAtValue.seconds * 1000);
        } else {
          // String or number
          expiresAt = new Date(expiresAtValue);
        }
        
        console.log('🔍 AdminAuth: Checking expiration - now:', now.toISOString(), 'expires:', expiresAt.toISOString());
      } catch (error) {
        console.error('🔍 AdminAuth: Error parsing expiresAt:', error, 'expiresAt value:', sessionData.expiresAt);
        return { success: false, error: 'Invalid session expiration date' };
      }
      
      if (now > expiresAt) {
        console.log('🔍 AdminAuth: Session expired, logging out');
        // Delete expired session
        await this.logout();
        return { success: false, error: 'Session expired' };
      }
      
      console.log('🔍 AdminAuth: Session is still valid');

      // Verify admin still exists and is active
      console.log('🔍 AdminAuth: Verifying admin account...');
      const adminData = await this.getAdminConfig();
      
      if (!adminData) {
        console.log('🔍 AdminAuth: Admin account not found, logging out');
        await this.logout();
        return { success: false, error: 'Admin account not found' };
      }

      console.log('🔍 AdminAuth: Admin data:', {
        isActive: adminData.isActive,
        role: adminData.role
      });
      
      if (!adminData.isActive) {
        console.log('🔍 AdminAuth: Admin account is deactivated, logging out');
        await this.logout();
        return { success: false, error: 'Admin account is deactivated' };
      }
      
      console.log('🔍 AdminAuth: Admin account is valid and active');

      console.log('✅ AdminAuth: Session verification successful');
      console.log('✅ AdminAuth: Returning session data:', {
        token: sessionData.token,
        isAuthenticated: sessionData.isAuthenticated,
        expiresAt: sessionData.expiresAt
      });
      return { success: true, session: sessionData };
    } catch (error: any) {
      console.error('Session verification error:', error);
      return { success: false, error: 'Session verification failed' };
    }
  }

  // Logout admin
  async logout(): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('🔐 AdminAuth: Starting logout process...');
      const token = this.getSessionToken();
      console.log('🔐 AdminAuth: Current session token:', token ? 'exists' : 'not found');
      
      // Delete session from Firestore
      if (token) {
        try {
          console.log('🔐 AdminAuth: Deleting session from Firestore...');
          await setDoc(doc(db, 'admin_sessions', token), {
            deletedAt: new Date(),
          }, { merge: true });
          console.log('🔐 AdminAuth: Session deleted from Firestore');
        } catch (error) {
          console.warn('Failed to delete session from Firestore:', error);
        }
      }

      // No need to sign out from Firebase since we're not using Firebase Auth
      console.log('🔐 AdminAuth: Skipping Firebase sign out (not using Firebase Auth)');

      // Delete session token
      console.log('🔐 AdminAuth: Deleting session token...');
      this.deleteSessionToken();
      console.log('🔐 AdminAuth: Session token deleted');

      console.log('🔐 AdminAuth: Logout completed successfully');
      return { success: true };
    } catch (error: any) {
      console.error('Logout error:', error);
      return { success: false, error: error.message };
    }
  }

  // Get current session
  getCurrentSession(): AdminSession | null {
    console.log('🔍 AdminAuth: Getting current session...');
    const token = this.getSessionToken();
    console.log('🔍 AdminAuth: Current token:', token ? 'exists' : 'not found');
    
    if (!token) {
      console.log('🔍 AdminAuth: No token found, returning null');
      return null;
    }

    // Note: This is a basic check. For full verification, use verifySession()
    const session = {
      token,
      expiresAt: new Date(Date.now() + this.SESSION_DURATION), // Approximate
      isAuthenticated: true,
    };
    console.log('🔍 AdminAuth: Returning basic session:', session);
    return session;
  }

  // Check if admin is logged in (quick check)
  isLoggedIn(): boolean {
    const token = this.getSessionToken();
    const isLoggedIn = token !== null;
    console.log('🔍 AdminAuth: isLoggedIn check - token exists:', !!token, 'result:', isLoggedIn);
    return isLoggedIn;
  }
}

// Create and export singleton instance
export const adminAuthService = new AdminAuthService();

// Initialize admin configuration (run this once to set up the admin account)
export const initializeAdmin = async () => {
  return await adminAuthService.initializeAdminConfig();
};

// Clean up any locally stored admin config for security
export const cleanupLocalAdminConfig = () => {
  try {
    // Remove any old admin config from localStorage
    const keysToRemove = ['admin_config_local', 'admin_config'];
    keysToRemove.forEach(key => {
      if (localStorage.getItem(key)) {
        localStorage.removeItem(key);
        console.log(`✅ Removed ${key} from localStorage for security`);
      }
    });
  } catch (error) {
    console.error('Error cleaning up local admin config:', error);
  }
}; 