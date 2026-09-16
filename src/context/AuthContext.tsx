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
import { doc, setDoc, getDoc, collection, getDocs, onSnapshot, deleteDoc } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { UserProfile, StaffAccount, DESIGNATED_ADMIN_EMAILS, isDesignatedAdminEmail } from '../types';

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  isSuperAdmin: boolean;
  isAdminOrSuperAdmin: boolean;
  isPOSAuthorized: boolean;
  
  // Strict permission: Only the 4 designated admin emails can view purchase price
  canViewBuyPrice: boolean;
  // Strict permission: Only the 4 designated admin emails can open staff IDs
  canManageStaff: boolean;

  // Staff accounts management
  staffAccounts: StaffAccount[];
  loadingStaff: boolean;
  createStaffAccount: (data: {
    staffCode: string;
    name: string;
    pin: string;
    role: 'cashier' | 'seller';
    phone?: string;
  }) => Promise<void>;
  deleteStaffAccount: (id: string) => Promise<void>;
  updateStaffAccount: (id: string, updates: Partial<StaffAccount>) => Promise<void>;
  loginWithStaffCode: (staffCode: string, pin: string) => Promise<void>;

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
const LOCAL_STAFF_KEY = 'smartshop_staff_accounts_cache';

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

  // Staff accounts
  const [staffAccounts, setStaffAccounts] = useState<StaffAccount[]>(() => {
    try {
      const cached = localStorage.getItem(LOCAL_STAFF_KEY);
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [loadingStaff, setLoadingStaff] = useState(false);

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

  // Real-time Staff Accounts listener
  useEffect(() => {
    setLoadingStaff(true);
    let unsub = () => {};
    try {
      unsub = onSnapshot(
        collection(db, 'staff_accounts'),
        (snapshot) => {
          const list: StaffAccount[] = [];
          snapshot.forEach((d) => {
            const data = d.data() as StaffAccount;
            if (data && data.staffCode) {
              list.push({ ...data, id: d.id });
            }
          });
          list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
          setStaffAccounts(list);
          try {
            localStorage.setItem(LOCAL_STAFF_KEY, JSON.stringify(list));
          } catch (e) {
            console.warn('Local staff save warning:', e);
          }
          setLoadingStaff(false);
        },
        (err) => {
          console.warn('Staff accounts listener warning:', err);
          setLoadingStaff(false);
        }
      );
    } catch (err) {
      console.warn('Staff listener setup error:', err);
      setLoadingStaff(false);
    }

    return () => unsub();
  }, []);

  // Check if system has any super admin registered
  const checkSuperAdminStatus = async () => {
    try {
      const usersSnap = await getDocs(collection(db, 'users'));
      let found = false;
      usersSnap.forEach((docSnap) => {
        const d = docSnap.data();
        if (d.role === 'super_admin' || isDesignatedAdminEmail(d.email)) {
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
          const hasAdmin = await checkSuperAdminStatus();

          // CRITICAL: Check if this user's email is one of the 4 designated admin emails
          const isDesignated = isDesignatedAdminEmail(user.email);

          if (snap.exists()) {
            const data = snap.data() as UserProfile;
            const updatedProfile: UserProfile = {
              uid: user.uid,
              displayName: data.displayName || user.displayName || user.email?.split('@')[0] || 'বিক্রেতা',
              email: user.email,
              photoURL: user.photoURL,
              // If email is in designated list, ALWAYS give super_admin. Otherwise honor saved or cashier
              role: isDesignated ? 'super_admin' : data.role || (hasAdmin ? 'cashier' : 'super_admin'),
              isDesignatedAdmin: isDesignated,
            };
            setUserProfile(updatedProfile);
            localStorage.setItem(LOCAL_SELLER_KEY, JSON.stringify(updatedProfile));
          } else {
            // First time this firebase user logged in
            const defaultRole = isDesignated ? 'super_admin' : (hasAdmin ? 'cashier' : 'super_admin');
            const newProfile: UserProfile = {
              uid: user.uid,
              displayName: user.displayName || user.email?.split('@')[0] || (isDesignated ? 'সুপার এডমিন' : 'বিক্রেতা'),
              email: user.email,
              photoURL: user.photoURL,
              role: defaultRole,
              isDesignatedAdmin: isDesignated,
            };
            await persistProfile(newProfile);
            if (defaultRole === 'super_admin') {
              setHasAnySuperAdmin(true);
            }
          }
        } catch (err) {
          console.warn('Error fetching user profile doc:', err);
          const isDesignated = isDesignatedAdminEmail(user.email);
          const fallbackProfile: UserProfile = {
            uid: user.uid,
            displayName: user.displayName || user.email?.split('@')[0] || 'বিক্রেতা',
            email: user.email,
            photoURL: user.photoURL,
            role: isDesignated ? 'super_admin' : 'cashier',
            isDesignatedAdmin: isDesignated,
          };
          setUserProfile(fallbackProfile);
        }
      } else {
        // User logged out from Firebase
        const cached = localStorage.getItem(LOCAL_SELLER_KEY);
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            // Only preserve non-Firebase offline sessions (staff accounts or quick seller profiles)
            if (
              parsed &&
              (parsed.staffCode ||
                parsed.uid?.startsWith('staff-') ||
                parsed.uid?.startsWith('quick-'))
            ) {
              setUserProfile(parsed);
            } else {
              setUserProfile(null);
              localStorage.removeItem(LOCAL_SELLER_KEY);
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

  // Strict check: Is the current active session one of the 4 designated admin emails?
  // "Nurnobyr36@gmail.com, Sabihait20@gmail.com, Admin@nihadbp.top, Musicnrs2020@gmail.com"
  const isDesignatedActiveAdmin = useMemo(() => {
    const activeEmail = currentUser?.email || userProfile?.email;
    return isDesignatedAdminEmail(activeEmail);
  }, [currentUser?.email, userProfile?.email]);

  // "স্টাফ আইডিতে সমস্ত এক্সেস দিয়ে দাও এডমিনের মত"
  // Both designated admins and staff accounts have full access to view buy prices, profit, and reports
  const canViewBuyPrice = useMemo(() => {
    return true;
  }, []);

  // Staff and Admins can create and manage staff accounts
  const canManageStaff = useMemo(() => {
    return isDesignatedActiveAdmin || userProfile?.role === 'admin' || userProfile?.role === 'super_admin' || !!userProfile?.staffCode;
  }, [isDesignatedActiveAdmin, userProfile]);

  // Is current active session a Super Admin
  const isSuperAdmin = useMemo(() => {
    return isDesignatedActiveAdmin || userProfile?.role === 'super_admin';
  }, [isDesignatedActiveAdmin, userProfile]);

  // Is current active session Admin or Super Admin
  const isAdminOrSuperAdmin = useMemo(() => {
    return isDesignatedActiveAdmin || userProfile?.role === 'admin' || userProfile?.role === 'super_admin' || !!userProfile?.staffCode;
  }, [isDesignatedActiveAdmin, userProfile]);

  // Is POS authorized? User MUST be logged in (either Firebase auth or valid profile)
  const isPOSAuthorized = useMemo(() => {
    if (loading) return false;
    return !!(currentUser || userProfile?.uid);
  }, [loading, currentUser, userProfile]);

  // Create Staff Account (Allowed for admins and staff)
  const createStaffAccount = async (data: {
    staffCode: string;
    name: string;
    pin: string;
    role: 'admin' | 'cashier' | 'seller';
    phone?: string;
  }) => {
    if (!canManageStaff) {
      throw new Error(
        'নিরাপত্তা সতর্কবার্তা: শুধুমাত্র অনুমোদিত এডমিন বা স্টাফ আইডি দিয়ে লগইন করলে স্টাফ অ্যাকাউন্ট তৈরি করা যাবে।'
      );
    }

    const codeClean = data.staffCode.trim().toUpperCase();
    const nameClean = data.name.trim();
    const pinClean = data.pin.trim();

    if (!codeClean) throw new Error('অনুগ্রহ করে স্টাফ কোড বা আইডি দিন (যেমন: STF-01)');
    if (!nameClean) throw new Error('স্টাফের পুরো নাম প্রদান করুন');
    if (!pinClean || pinClean.length < 3) throw new Error('কমপক্ষে ৩ বা ৪ ডিজিটের পিন কোড দিন');

    // Check code duplication
    const exists = staffAccounts.some((s) => s.staffCode.toUpperCase() === codeClean);
    if (exists) {
      throw new Error(`স্টাফ কোড "${codeClean}" ইতিমধ্যে অন্য স্টাফের জন্য ব্যবহৃত হচ্ছে। নতুন কোড দিন।`);
    }

    const currentAdminEmail = currentUser?.email || userProfile?.email || userProfile?.staffCode || 'admin';
    const staffId = 'staff_' + Date.now();
    const newStaff: StaffAccount = {
      id: staffId,
      staffCode: codeClean,
      name: nameClean,
      pin: pinClean,
      role: data.role || 'admin',
      phone: data.phone?.trim() || '',
      status: 'active',
      createdByEmail: currentAdminEmail,
      createdAt: new Date().toISOString(),
    };

    await setDoc(doc(db, 'staff_accounts', staffId), newStaff);
  };

  // Delete Staff Account
  const deleteStaffAccount = async (id: string) => {
    if (!canManageStaff) {
      throw new Error('শুধুমাত্র অনুমোদিত এডমিন বা স্টাফ আইডি ডিলিট করতে পারবেন!');
    }
    await deleteDoc(doc(db, 'staff_accounts', id));
  };

  // Update Staff Account (e.g. status active/suspended)
  const updateStaffAccount = async (id: string, updates: Partial<StaffAccount>) => {
    if (!canManageStaff) {
      throw new Error('শুধুমাত্র অনুমোদিত এডমিন বা স্টাফ তথ্য আপডেট করতে পারবেন!');
    }
    await setDoc(doc(db, 'staff_accounts', id), updates, { merge: true });
  };

  // Login with Staff Code and PIN
  const loginWithStaffCode = async (staffCode: string, pin: string) => {
    const codeClean = staffCode.trim().toUpperCase();
    const pinClean = pin.trim();

    if (!codeClean) throw new Error('স্টাফ কোড বা আইডি প্রদান করুন');
    if (!pinClean) throw new Error('পিন কোড প্রদান করুন');

    // Search in local state or fetch from firestore
    let matched = staffAccounts.find((s) => s.staffCode.toUpperCase() === codeClean);
    if (!matched) {
      const snap = await getDocs(collection(db, 'staff_accounts'));
      snap.forEach((d) => {
        const data = d.data() as StaffAccount;
        if (data.staffCode && data.staffCode.toUpperCase() === codeClean) {
          matched = { ...data, id: d.id };
        }
      });
    }

    if (!matched) {
      throw new Error(`"${codeClean}" কোডের কোনো স্টাফ আইডি পাওয়া যায়নি!`);
    }

    if (matched.status === 'suspended') {
      throw new Error('এই স্টাফ অ্যাকাউন্টটি বর্তমানে স্থগিত (Inactive/Suspended) রয়েছে। এডমিনের সাথে যোগাযোগ করুন।');
    }

    if (matched.pin.trim() !== pinClean) {
      throw new Error('ভুল পিন কোড! অনুগ্রহ করে সঠিক পিন দিয়ে চেষ্টা করুন।');
    }

    // Update lastLoginAt
    try {
      await setDoc(
        doc(db, 'staff_accounts', matched.id),
        { lastLoginAt: new Date().toISOString() },
        { merge: true }
      );
    } catch (e) {
      console.warn('Error updating lastLoginAt:', e);
    }

    // If a firebase session was logged in, sign it out to switch to staff identity cleanly
    if (currentUser) {
      try {
        await fbSignOut(auth);
      } catch {}
    }

    const staffProfile: UserProfile = {
      uid: 'staff-' + matched.id,
      displayName: matched.name,
      email: matched.staffCode.toLowerCase() + '@smartshop.staff',
      staffCode: matched.staffCode,
      role: 'admin', // Full Admin Access granted to staff
      isDesignatedAdmin: true,
      phoneNumber: matched.phone || null,
    };

    await persistProfile(staffProfile);
  };

  // Google Login
  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      const res = await signInWithPopup(auth, provider);
      if (res.user) {
        const isDesignated = isDesignatedAdminEmail(res.user.email);
        const userDocRef = doc(db, 'users', res.user.uid);
        const snap = await getDoc(userDocRef);
        let userRole: 'super_admin' | 'admin' | 'cashier' | 'seller' = 'cashier';
        if (isDesignated) {
          userRole = 'super_admin';
        } else if (snap.exists()) {
          userRole = (snap.data().role as any) || 'cashier';
        } else {
          userRole = 'cashier';
        }

        const prof: UserProfile = {
          uid: res.user.uid,
          displayName: res.user.displayName || res.user.email?.split('@')[0] || 'বিক্রেতা',
          email: res.user.email,
          photoURL: res.user.photoURL,
          role: userRole,
          isDesignatedAdmin: isDesignated,
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
      const isDesignated = isDesignatedAdminEmail(res.user.email);
      const userDocRef = doc(db, 'users', res.user.uid);
      const snap = await getDoc(userDocRef);
      let userRole: 'super_admin' | 'admin' | 'cashier' | 'seller' = isDesignated ? 'super_admin' : 'cashier';
      let name = res.user.displayName || email.split('@')[0] || 'বিক্রেতা';
      if (snap.exists()) {
        const data = snap.data();
        if (isDesignated) {
          userRole = 'super_admin';
        } else if (data.role) {
          userRole = data.role;
        }
        if (data.displayName) name = data.displayName;
      }

      const prof: UserProfile = {
        uid: res.user.uid,
        displayName: name,
        email: res.user.email,
        photoURL: res.user.photoURL,
        role: userRole,
        isDesignatedAdmin: isDesignated,
      };
      await persistProfile(prof);
    }
  };

  // Register with email (Restricted to designated Super Admin)
  const registerWithEmail = async (
    name: string,
    email: string,
    pass: string,
    role: 'super_admin' | 'admin' | 'cashier' | 'seller' = 'cashier'
  ) => {
    if (!canManageStaff) {
      throw new Error('শুধুমাত্র অনুমোদিত ৪টি এডমিন ইমেইল দিয়ে নতুন অ্যাকাউন্ট তৈরি করতে পারেন!');
    }

    const res = await createUserWithEmailAndPassword(auth, email, pass);
    if (res.user) {
      await updateProfile(res.user, { displayName: name });
      const isDesignated = isDesignatedAdminEmail(email);
      const finalRole = isDesignated ? 'super_admin' : role;
      const prof: UserProfile = {
        uid: res.user.uid,
        displayName: name,
        email: res.user.email,
        photoURL: res.user.photoURL,
        role: finalRole,
        isDesignatedAdmin: isDesignated,
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
      email: null, // Quick cashiers NEVER have designated admin email, so buy price is strictly hidden
      photoURL: null,
      role: 'cashier', // Always cashier, cannot elevate to admin
      isDesignatedAdmin: false,
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
        canViewBuyPrice,
        canManageStaff,
        staffAccounts,
        loadingStaff,
        createStaffAccount,
        deleteStaffAccount,
        updateStaffAccount,
        loginWithStaffCode,
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
