import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  signInWithPopup, 
  signInWithRedirect,
  getRedirectResult,
  signOut, 
  onAuthStateChanged, 
  User 
} from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  address?: string;
  phone?: string;
  city?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signInWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  signInWithGoogleRedirect: () => Promise<{ success: boolean; error?: string }>;
  signOutUser: () => Promise<{ success: boolean; error?: string }>;
  updateUserProfile: (updates: Partial<UserProfile>) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Check for redirect result first
        const result = await getRedirectResult(auth);
        if (result) {
          console.log('Redirect sign-in successful');
          // Handle successful redirect sign-in
          const userProfile: UserProfile = {
            uid: result.user.uid,
            email: result.user.email || '',
            displayName: result.user.displayName || '',
            photoURL: result.user.photoURL || '',
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          
          try {
            await setDoc(doc(db, 'users', result.user.uid), userProfile, { merge: true });
            setUserProfile(userProfile);
          } catch (firestoreError: any) {
            console.warn('Firestore save failed after redirect, setting profile locally');
            setUserProfile(userProfile);
          }
        }
      } catch (error) {
        console.error('Error handling redirect result:', error);
      }

      // Set up auth state listener
      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        setUser(user);
        if (user) {
          // Fetch or create user profile
          const userProfile = await getUserProfile(user.uid);
          setUserProfile(userProfile);
        } else {
          setUserProfile(null);
        }
        setLoading(false);
      });

      return unsubscribe;
    };

    initializeAuth();
  }, []);

  const signInWithGoogle = async () => {
    try {
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout')), 30000);
      });

      // Configure Google provider with additional scopes if needed
      googleProvider.addScope('email');
      googleProvider.addScope('profile');

      const signInPromise = signInWithPopup(auth, googleProvider);
      const result = await Promise.race([signInPromise, timeoutPromise]) as any;
      
      const user = result.user;
      
      // Create or update user profile
      const userProfile: UserProfile = {
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || '',
        photoURL: user.photoURL || '',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      try {
        await setDoc(doc(db, 'users', user.uid), userProfile, { merge: true });
        setUserProfile(userProfile);
        return { success: true };
      } catch (firestoreError: any) {
        console.error('Error saving user profile:', firestoreError);
        
        // Ignore network errors that are likely caused by ad blockers
        if (firestoreError.message?.includes('ERR_BLOCKED_BY_CLIENT') || 
            firestoreError.message?.includes('net::ERR_BLOCKED_BY_CLIENT')) {
          console.warn('Firestore request blocked by client (likely ad blocker), setting profile locally');
          setUserProfile(userProfile);
          return { success: true };
        }
        
        // If Firestore fails, still set the user profile locally
        setUserProfile(userProfile);
        
        if (firestoreError.code === 'permission-denied' || firestoreError.message.includes('Missing or insufficient permissions')) {
          return { 
            success: false, 
            error: 'تم تسجيل الدخول بنجاح ولكن فشل في حفظ البيانات. يرجى التحقق من قواعد Firestore.' 
          };
        }
        
        return { success: true }; // Still consider it successful
      }
    } catch (error: any) {
      console.error('Error signing in with Google:', error);
      
      // Handle specific Firebase errors
      let errorMessage = 'حدث خطأ أثناء تسجيل الدخول';
      
      // Check for browser extension interference
      if (error.message?.includes('runtime.lastError') || 
          error.message?.includes('Could not establish connection') ||
          error.message?.includes('Receiving end does not exist')) {
        errorMessage = 'تم حظر النافذة المنبثقة بواسطة إضافة المتصفح. يرجى تعطيل Ad Blocker أو السماح بالنوافذ المنبثقة.';
      } else if (error.message?.includes('Cross-Origin-Opener-Policy') ||
                 error.message?.includes('window.closed')) {
        errorMessage = 'خطأ في سياسات الأمان. يرجى المحاولة مرة أخرى أو تحديث المتصفح.';
      } else if (error.message === 'Timeout') {
        errorMessage = 'انتهت مهلة تسجيل الدخول. يرجى المحاولة مرة أخرى.';
      } else if (error.code === 'auth/configuration-not-found') {
        errorMessage = 'خطأ في إعدادات Firebase. يرجى التحقق من التكوين.';
      } else if (error.code === 'auth/popup-closed-by-user') {
        errorMessage = 'تم إغلاق نافذة تسجيل الدخول';
      } else if (error.code === 'auth/popup-blocked') {
        errorMessage = 'تم حظر النافذة المنبثقة. يرجى السماح بالنوافذ المنبثقة.';
      } else if (error.code === 'auth/unauthorized-domain') {
        errorMessage = 'هذا النطاق غير مصرح له. يرجى التحقق من إعدادات Firebase.';
      } else if (error.code === 'permission-denied' || error.message.includes('Missing or insufficient permissions')) {
        errorMessage = 'خطأ في الصلاحيات. يرجى التحقق من قواعد الأمان في Firestore.';
      }
      
      return { success: false, error: errorMessage };
    }
  };

  const signInWithGoogleRedirect = async () => {
    try {
      // Configure Google provider with additional scopes if needed
      googleProvider.addScope('email');
      googleProvider.addScope('profile');
      
      await signInWithRedirect(auth, googleProvider);
      return { success: true };
    } catch (error: any) {
      console.error('Error signing in with Google redirect:', error);
      return { success: false, error: 'حدث خطأ أثناء تسجيل الدخول' };
    }
  };

  const signOutUser = async () => {
    try {
      await signOut(auth);
      setUserProfile(null);
      return { success: true };
    } catch (error: any) {
      console.error('Error signing out:', error);
      return { success: false, error: error.message };
    }
  };

  const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        return {
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        } as UserProfile;
      }
      return null;
    } catch (error: any) {
      console.error('Error fetching user profile:', error);
      
      // Ignore network errors that are likely caused by ad blockers
      if (error.message?.includes('ERR_BLOCKED_BY_CLIENT') || 
          error.message?.includes('net::ERR_BLOCKED_BY_CLIENT')) {
        console.warn('Firestore fetch blocked by client (likely ad blocker), returning null');
        return null;
      }
      
      // If it's a permissions error, return null instead of throwing
      if (error.code === 'permission-denied' || error.message.includes('Missing or insufficient permissions')) {
        console.warn('Permissions error when fetching user profile, returning null');
        return null;
      }
      
      return null;
    }
  };

  const updateUserProfile = async (updates: Partial<UserProfile>) => {
    if (!user) return { success: false, error: 'No user logged in' };

    const updatedProfile = {
      ...userProfile,
      ...updates,
      updatedAt: new Date(),
    };

    try {
      await setDoc(doc(db, 'users', user.uid), updatedProfile, { merge: true });
      setUserProfile(updatedProfile);
      
      return { success: true };
    } catch (error: any) {
      console.error('Error updating user profile:', error);
      
      // Ignore network errors that are likely caused by ad blockers
      if (error.message?.includes('ERR_BLOCKED_BY_CLIENT') || 
          error.message?.includes('net::ERR_BLOCKED_BY_CLIENT')) {
        console.warn('Firestore update blocked by client (likely ad blocker), updating profile locally');
        setUserProfile(updatedProfile);
        return { success: true };
      }
      
      return { success: false, error: error.message };
    }
  };

  const value: AuthContextType = {
    user,
    userProfile,
    loading,
    signInWithGoogle,
    signInWithGoogleRedirect,
    signOutUser,
    updateUserProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 