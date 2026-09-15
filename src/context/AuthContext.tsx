import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut as fbSignOut,
} from 'firebase/auth';
import { doc, setDoc, getDoc, collection, getDocs } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../services/firebase';
import { UserProfile } from '../types';

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  isSuperAdmin: boolean;
  isAdminOrSuperAdmin: boolean;
  isPOSAuthorized: boolean;
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  registerWithEmail: (name: string, email: string, pass: string, role?: 'super_admin' | 'admin' | 'cashier' | 'seller') => Promise<void>;
  quickCashierLogin: (name: string, role?: 'cashier' | 'seller' | 'admin' | 'super_admin') => Promise<void>;
  updateCurrentSellerName: (newName: string) => Promise<void>;
  logout: () => Promise<void>;
  sellerName: string;
  hasAnySuperAdmin: boolean;
}

const LOCAL_SELLER_KEY = 'smartshop_active_seller_profile';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(() => {
    try {
      const cached = localStorage.getItem(LOCAL_SELLER_KEY);
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);
  const [hasAnySuperAdmin, setHasAnySuperAdmin] = useState(false);

  // Sync profile to localStorage and firestore
  const persistProfile = async (profile: UserProfile) => {
    setUserProfile(profile);
    try {
      localStorage.setItem(LOCAL_SELLER_KEY, JSON.stringify(profile));
      if (profile.uid) {
        await setDoc(
          doc(db, 'users', profile.uid),
          {
            ...profile,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      }
    } catch (e) {
      console.warn('Could not persist profile:', e);
    }
  };

  // Check if system has any super admin registered
  const checkSuperAdminStatus = async () => {
    try {
      const usersSnap = await getDocs(collection(db, 'users'));
      let found = false;
      usersSnap.forEach((docSnap) => {
        const d = docSnap.data();
        if (d.role === 'super_admin') {
          found = true;
        }
      });
      setHasAnySuperAdmin(found);
      return found;
    } catch (e) {
      console.warn('Error checking super admin presence:', e);
      return false;
    }
  };

  useEffect(() => {
    checkSuperAdminStatus();

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          const userDocRef = doc(db, 'users', user.uid);
          const snap = await getDoc(userDocRef);

          // Check if there are any users or if this user is designated super_admin
          const hasAdmin = await checkSuperAdminStatus();

          if (snap.exists()) {
            const data = snap.data() as UserProfile;
            const updatedProfile: UserProfile = {
              uid: user.uid,
              displayName: data.displayName || user.displayName || user.email?.split('@')[0] || 'বিক্রেতা',
              email: user.email,
              photoURL: user.photoURL,
              role: data.role || (hasAdmin ? 'cashier' : 'super_admin'),
            };
            setUserProfile(updatedProfile);
            localStorage.setItem(LOCAL_SELLER_KEY, JSON.stringify(updatedProfile));
          } else {
            // If first user, make them super_admin by default so shop owner has full control
            const defaultRole = hasAdmin ? 'cashier' : 'super_admin';
            const newProfile: UserProfile = {
              uid: user.uid,
              displayName: user.displayName || user.email?.split('@')[0] || (defaultRole === 'super_admin' ? 'সুপার এডমিন' : 'বিক্রেতা'),
              email: user.email,
              photoURL: user.photoURL,
              role: defaultRole,
            };
            await persistProfile(newProfile);
            if (defaultRole === 'super_admin') {
              setHasAnySuperAdmin(true);
            }
          }
        } catch (err) {
          console.warn('Error fetching user profile doc:', err);
          const fallbackProfile: UserProfile = {
            uid: user.uid,
            displayName: user.displayName || user.email?.split('@')[0] || 'বিক্রেতা',
            email: user.email,
            photoURL: user.photoURL,
            role: 'cashier',
          };
          setUserProfile(fallbackProfile);
        }
      } else {
        // User logged out from Firebase
        const cached = localStorage.getItem(LOCAL_SELLER_KEY);
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (parsed && !parsed.uid.startsWith('firebase-')) {
              setUserProfile(parsed);
            } else {
              setUserProfile(null);
            }
          } catch {
            setUserProfile(null);
          }
        } else {
          setUserProfile(null);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Is current active session a Super Admin
  const isSuperAdmin = useMemo(() => {
    return userProfile?.role === 'super_admin';
  }, [userProfile]);

  // Is current active session Admin or Super Admin
  const isAdminOrSuperAdmin = useMemo(() => {
    return userProfile?.role === 'super_admin' || userProfile?.role === 'admin';
  }, [userProfile]);

  // Is POS authorized? User MUST be logged in (either Firebase auth or valid profile)
  const isPOSAuthorized = useMemo(() => {
    if (loading) return false;
    // Must have a logged in user with valid profile
    return !!(currentUser || userProfile?.uid);
  }, [loading, currentUser, userProfile]);

  // Google Login
  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      const res = await signInWithPopup(auth, provider);
      if (res.user) {
        // Fetch existing role or assign
        const userDocRef = doc(db, 'users', res.user.uid);
        const snap = await getDoc(userDocRef);
        let userRole: 'super_admin' | 'admin' | 'cashier' | 'seller' = 'cashier';
        if (snap.exists()) {
          userRole = (snap.data().role as any) || 'cashier';
        } else {
          userRole = hasAnySuperAdmin ? 'cashier' : 'super_admin';
        }

        const prof: UserProfile = {
          uid: res.user.uid,
          displayName: res.user.displayName || res.user.email?.split('@')[0] || 'বিক্রেতা',
          email: res.user.email,
          photoURL: res.user.photoURL,
          role: userRole,
        };
        await persistProfile(prof);
      }
    } catch (err: any) {
      console.warn('Google popup error, attempting redirect fallback:', err);
      if (err.code === 'auth/popup-blocked' || err.code === 'auth/cancelled-popup-request') {
        await signInWithRedirect(auth, provider);
      } else {
        throw err;
      }
    }
  };

  // Email & Password login
  const loginWithEmail = async (email: string, pass: string) => {
    const res = await signInWithEmailAndPassword(auth, email, pass);
    if (res.user) {
      const userDocRef = doc(db, 'users', res.user.uid);
      const snap = await getDoc(userDocRef);
      let userRole: 'super_admin' | 'admin' | 'cashier' | 'seller' = 'cashier';
      let name = res.user.displayName || email.split('@')[0] || 'বিক্রেতা';
      if (snap.exists()) {
        const data = snap.data();
        if (data.role) userRole = data.role;
        if (data.displayName) name = data.displayName;
      }

      const prof: UserProfile = {
        uid: res.user.uid,
        displayName: name,
        email: res.user.email,
        photoURL: res.user.photoURL,
        role: userRole,
      };
      await persistProfile(prof);
    }
  };

  // Register with email (Restricted to Super Admin or first initial setup)
  const registerWithEmail = async (
    name: string,
    email: string,
    pass: string,
    role: 'super_admin' | 'admin' | 'cashier' | 'seller' = 'cashier'
  ) => {
    // Only Super Admin can register new accounts if a super admin already exists
    if (hasAnySuperAdmin && !isSuperAdmin) {
      throw new Error('শুধুমাত্র সুপার এডমিন নতুন অ্যাকাউন্ট তৈরি করতে পারেন!');
    }

    const res = await createUserWithEmailAndPassword(auth, email, pass);
    if (res.user) {
      await updateProfile(res.user, { displayName: name });
      const finalRole = !hasAnySuperAdmin ? 'super_admin' : role;
      const prof: UserProfile = {
        uid: res.user.uid,
        displayName: name,
        email: res.user.email,
        photoURL: res.user.photoURL,
        role: finalRole,
      };
      await persistProfile(prof);
      if (finalRole === 'super_admin') {
        setHasAnySuperAdmin(true);
      }
    }
  };

  // Fast Cashier Shift / Direct seller profile
  const quickCashierLogin = async (
    name: string,
    role: 'cashier' | 'seller' | 'admin' | 'super_admin' = 'cashier'
  ) => {
    const cleanName = name.trim() || 'ক্যাশিয়ার';
    const profileId = 'seller-' + Date.now();
    const prof: UserProfile = {
      uid: profileId,
      displayName: cleanName,
      email: null,
      photoURL: null,
      role,
    };
    await persistProfile(prof);
  };

  // Update seller display name on the fly
  const updateCurrentSellerName = async (newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    if (currentUser) {
      try {
        await updateProfile(currentUser, { displayName: trimmed });
      } catch (e) {
        console.warn('Could not update Firebase user profile:', e);
      }
    }
    const updated: UserProfile = {
      ...(userProfile || { uid: 'seller-' + Date.now(), email: null, role: 'cashier' }),
      displayName: trimmed,
    };
    await persistProfile(updated);
  };

  // Logout
  const logout = async () => {
    try {
      await fbSignOut(auth);
    } catch (e) {
      console.warn('Signout error:', e);
    }
    setUserProfile(null);
    localStorage.removeItem(LOCAL_SELLER_KEY);
  };

  const sellerName = useMemo(() => {
    if (userProfile?.displayName) return userProfile.displayName;
    if (currentUser?.displayName) return currentUser.displayName;
    if (currentUser?.email) return currentUser.email.split('@')[0];
    return 'সাধারণ বিক্রেতা';
  }, [userProfile, currentUser]);

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        loading,
        isSuperAdmin,
        isAdminOrSuperAdmin,
        isPOSAuthorized,
        loginWithGoogle,
        loginWithEmail,
        registerWithEmail,
        quickCashierLogin,
        updateCurrentSellerName,
        logout,
        sellerName,
        hasAnySuperAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

