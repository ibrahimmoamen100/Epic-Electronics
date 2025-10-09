import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from './firebase';

export interface AdminCredentials {
  email: string;
  password: string;
  role: 'admin';
  createdAt: Date;
  lastLogin: Date;
  isActive: boolean;
}

export interface AdminSession {
  token: string;
  expiresAt: Date;
  adminId: string;
  email: string;
}

class AdminAuthService {
  private readonly ADMIN_COLLECTION = 'admin_users';
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

  // Initialize admin user in Firebase (run once to set up admin)
  async initializeAdminUser(email: string, password: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Check if admin already exists
      const adminDoc = await getDoc(doc(db, this.ADMIN_COLLECTION, email));
      if (adminDoc.exists()) {
        return { success: false, error: 'Admin user already exists' };
      }

      // Create Firebase auth user
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Store admin credentials in Firestore
      const adminCredentials: AdminCredentials = {
        email,
        password: '', // Don't store password in Firestore for security
        role: 'admin',
        createdAt: new Date(),
        lastLogin: new Date(),
        isActive: true,
      };

      await setDoc(doc(db, this.ADMIN_COLLECTION, email), adminCredentials);

      return { success: true };
    } catch (error: any) {
      console.error('Error initializing admin user:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to initialize admin user' 
      };
    }
  }

  // Admin login
  async login(email: string, password: string): Promise<{ success: boolean; error?: string; session?: AdminSession }> {
    try {
      console.log('🔐 AdminAuth: Starting login for:', email);
      // Authenticate with Firebase
      console.log('🔐 AdminAuth: Authenticating with Firebase...');
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log('🔐 AdminAuth: Firebase authentication successful, user ID:', userCredential.user.uid);
      
      // Verify admin exists in Firestore
      console.log('🔐 AdminAuth: Verifying admin in Firestore...');
      const adminDoc = await getDoc(doc(db, this.ADMIN_COLLECTION, email));
      console.log('🔐 AdminAuth: Admin document exists:', adminDoc.exists());
      
      if (!adminDoc.exists()) {
        console.log('🔐 AdminAuth: Admin not found in Firestore, signing out');
        await auth.signOut();
        return { success: false, error: 'Admin access denied' };
      }

      const adminData = adminDoc.data() as AdminCredentials;
      console.log('🔐 AdminAuth: Admin data:', {
        email: adminData.email,
        isActive: adminData.isActive,
        role: adminData.role,
        lastLogin: adminData.lastLogin
      });
      
      if (!adminData.isActive) {
        console.log('🔐 AdminAuth: Admin account is deactivated, signing out');
        await auth.signOut();
        return { success: false, error: 'Admin account is deactivated' };
      }
      
      console.log('🔐 AdminAuth: Admin account is active and valid');

      // Update last login
      console.log('🔐 AdminAuth: Updating last login...');
      const updateData = {
        ...adminData,
        lastLogin: new Date(),
      };
      console.log('🔐 AdminAuth: Update data:', updateData);
      
      await setDoc(doc(db, this.ADMIN_COLLECTION, email), updateData, { merge: true });
      console.log('🔐 AdminAuth: Last login updated successfully');

      // Generate session token
      console.log('🔐 AdminAuth: Generating session token...');
      const token = this.generateToken();
      const expiresAt = new Date(Date.now() + this.SESSION_DURATION);
      console.log('🔐 AdminAuth: Token generated:', token);
      console.log('🔐 AdminAuth: Expires at:', expiresAt.toISOString());

      const session: AdminSession = {
        token,
        expiresAt,
        adminId: userCredential.user.uid,
        email,
      };
      console.log('🔐 AdminAuth: Session object created:', session);

      // Store session in Firestore
      console.log('🔐 AdminAuth: Storing session in Firestore...');
      const sessionData = {
        ...session,
        createdAt: new Date(),
      };
      console.log('🔐 AdminAuth: Session data to store:', sessionData);
      
      await setDoc(doc(db, 'admin_sessions', token), sessionData);
      console.log('🔐 AdminAuth: Session stored in Firestore successfully');

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
            email: verifyData.email,
            expiresAt: verifyData.expiresAt
          });
        }
      } catch (error) {
        console.error('🔐 AdminAuth: Error verifying session in Firestore:', error);
      }

      return { success: true, session };
    } catch (error: any) {
      console.error('Admin login error:', error);
      
      let errorMessage = 'Login failed';
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'Admin user not found';
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = 'Invalid password';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email format';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many failed attempts. Please try again later';
      }

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

      // Check if session exists in Firestore
      console.log('🔍 AdminAuth: Checking session in Firestore...');
      const sessionDoc = await getDoc(doc(db, 'admin_sessions', token));
      console.log('🔍 AdminAuth: Session document exists:', sessionDoc.exists());
      
      if (!sessionDoc.exists()) {
        console.log('🔍 AdminAuth: Session not found in Firestore, deleting token');
        this.deleteSessionToken();
        return { success: false, error: 'Invalid session token' };
      }

      const sessionData = sessionDoc.data() as AdminSession;
      console.log('🔍 AdminAuth: Session data retrieved:', {
        token: sessionData.token,
        email: sessionData.email,
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
      const adminDoc = await getDoc(doc(db, this.ADMIN_COLLECTION, sessionData.email));
      console.log('🔍 AdminAuth: Admin document exists:', adminDoc.exists());
      
      if (!adminDoc.exists()) {
        console.log('🔍 AdminAuth: Admin account not found, logging out');
        await this.logout();
        return { success: false, error: 'Admin account not found' };
      }

      const adminData = adminDoc.data() as AdminCredentials;
      console.log('🔍 AdminAuth: Admin data:', {
        email: adminData.email,
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
        email: sessionData.email,
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

      // Sign out from Firebase
      console.log('🔐 AdminAuth: Signing out from Firebase...');
      await auth.signOut();
      console.log('🔐 AdminAuth: Signed out from Firebase');

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
      adminId: '',
      email: '',
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

// Initialize admin user (run this once to set up the admin account)
export const initializeAdmin = async (email: string, password: string) => {
  return await adminAuthService.initializeAdminUser(email, password);
}; 