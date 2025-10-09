import { initializeAdmin } from '@/lib/adminAuth';

/**
 * Initialize Admin User Script
 * 
 * This script should be run once to set up the admin user in Firebase.
 * Run this in the browser console or create a temporary admin setup page.
 * 
 * Usage:
 * 1. Open browser console on your admin page
 * 2. Run: await initializeAdminUser('admin@yourstore.com', 'securepassword123')
 * 3. Delete this file after successful setup
 */

export const initializeAdminUser = async (email: string, password: string) => {
  try {
    console.log('Initializing admin user...');
    
    if (!email || !password) {
      throw new Error('Email and password are required');
    }

    if (password.length < 6) {
      throw new Error('Password must be at least 6 characters long');
    }

    const result = await initializeAdmin(email, password);
    
    if (result.success) {
      console.log('✅ Admin user created successfully!');
      console.log('Email:', email);
      console.log('You can now log in with these credentials.');
      return result;
    } else {
      console.error('❌ Failed to create admin user:', result.error);
      return result;
    }
  } catch (error: any) {
    console.error('❌ Error initializing admin user:', error);
    return { success: false, error: error.message };
  }
};

// Example usage (uncomment and modify as needed):
// await initializeAdminUser('admin@yourstore.com', 'your-secure-password-123');

export default initializeAdminUser; 