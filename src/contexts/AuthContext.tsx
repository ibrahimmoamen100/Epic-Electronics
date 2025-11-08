import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  signInWithRedirect,
  signOut, 
  onAuthStateChanged, 
  User 
} from 'firebase/auth';
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

  // يمكنك حذف كل الأكواد السابقة إذا لم يكن هناك مصادقة
  const value: AuthContextType = {
    user,
    userProfile,
    loading,
    signInWithGoogle: async () => ({ success: false, error: 'الإجراء غير مدعوم' }),
    signInWithGoogleRedirect: async () => ({ success: false, error: 'الإجراء غير مدعوم' }),
    signOutUser: async () => ({ success: false, error: 'الإجراء غير مدعوم' }),
    updateUserProfile: async () => ({ success: false, error: 'الإجراء غير مدعوم' })
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 