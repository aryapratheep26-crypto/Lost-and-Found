
import React, { useState } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut, 
  GoogleAuthProvider, 
  signInWithPopup,
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import { auth, db } from '../firebase';
import { AuthLayout } from './AuthLayout';
import { AlertCircle, LogIn, ShieldCheck, ArrowLeft, Mail, UserPlus, Building2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { ErrorBoundary, handleFirestoreError, OperationType } from '../lib/error-handling';
import { ADMIN_EMAILS, isDefaultAdminEmail, POLICE_STATIONS } from '../constants';
import { UserProfile } from '../types';

export const AdminLogin: React.FC = () => {
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);

  const handleAuth = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSigningIn) return;
    setIsSigningIn(true);
    setAuthError(null);
    setResetSent(false);
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const name = formData.get('name') as string;
    const stationId = formData.get('stationId') as string;

    try {
      if (authMode === 'signup') {
        if (!isDefaultAdminEmail(email)) {
          setAuthError("Access Denied: Only authorized police/admin accounts can sign up here");
          setIsSigningIn(false);
          return;
        }
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const newUser: UserProfile = {
          uid: userCredential.user.uid,
          name: name || 'Admin User',
          email: email,
          role: 'admin',
          createdAt: serverTimestamp(),
          nearestStationId: stationId
        };
        try {
          await setDoc(doc(db, 'users', userCredential.user.uid), newUser);
        } catch (error) {
          handleFirestoreError(error, OperationType.CREATE, `users/${userCredential.user.uid}`);
        }
      } else {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        let docSnap;
        try {
          docSnap = await getDoc(doc(db, 'users', user.uid));
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
          return;
        }
        
        if (!docSnap.exists()) {
          if (isDefaultAdminEmail(user.email)) {
            const newUser: UserProfile = {
              uid: user.uid,
              name: 'System Admin',
              email: user.email || '',
              role: 'admin',
              createdAt: serverTimestamp(),
            };
            try {
              await setDoc(doc(db, 'users', user.uid), newUser);
            } catch (error) {
              handleFirestoreError(error, OperationType.CREATE, `users/${user.uid}`);
            }
          } else {
            await signOut(auth);
            setAuthError("Access Denied: Only authorized police/admin accounts can log in here");
          }
        } else {
          const profileData = docSnap.data() as UserProfile;
          if (profileData.role !== 'admin') {
            if (isDefaultAdminEmail(user.email)) {
              try {
                await updateDoc(doc(db, 'users', user.uid), { role: 'admin' });
              } catch (error) {
                handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
              }
            } else {
              await signOut(auth);
              setAuthError("Access Denied: Only authorized police/admin accounts can log in here");
            }
          }
        }
      }
    } catch (error: any) {
      if (error.code === 'auth/operation-not-allowed') {
        setAuthError("Email/Password login is currently disabled. Please enable it in Firebase Console.");
      } else if (error.code === 'auth/invalid-credential') {
        setAuthError("Invalid admin credentials. Please check your email and password.");
      } else if (error.code === 'auth/email-already-in-use') {
        setAuthError("This email is already registered. Please login instead.");
      } else {
        setAuthError(error.message || "An error occurred during authentication");
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleForgotPassword = async () => {
    const email = (document.querySelector('input[name="email"]') as HTMLInputElement)?.value;
    if (!email) {
      setAuthError("Please enter your admin email first to reset password");
      return;
    }
    
    setIsSigningIn(true);
    setAuthError(null);
    try {
      await sendPasswordResetEmail(auth, email);
      setResetSent(true);
    } catch (error: any) {
      setAuthError(error.message);
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (isSigningIn) return;
    setIsSigningIn(true);
    const provider = new GoogleAuthProvider();
    setAuthError(null);
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      if (!isDefaultAdminEmail(user.email)) {
        await signOut(auth);
        setAuthError("Access Denied: Only authorized police/admin accounts can log in here");
        return;
      }
      
      const docRef = doc(db, 'users', user.uid);
      let docSnap;
      try {
        docSnap = await getDoc(docRef);
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
        return;
      }
      
      if (!docSnap.exists()) {
        const newUser: UserProfile = {
          uid: user.uid,
          name: user.displayName || 'Admin',
          email: user.email || '',
          role: 'admin',
          createdAt: serverTimestamp(),
        };
        try {
          await setDoc(docRef, newUser);
        } catch (error) {
          handleFirestoreError(error, OperationType.CREATE, `users/${user.uid}`);
        }
      } else {
        const profileData = docSnap.data() as UserProfile;
        if (profileData.role !== 'admin') {
          try {
            await updateDoc(docRef, { role: 'admin' });
          } catch (error) {
            handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
          }
        }
      }
    } catch (error: any) {
      setAuthError(error.message);
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <AuthLayout title="Police Admin" subtitle="Secure Administrator Login" isAdmin>
      <div className="mb-6">
        <Link 
          to="/login" 
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-indigo-400 transition-colors uppercase tracking-widest"
        >
          <ArrowLeft size={14} />
          <span>Back to Citizen Portal</span>
        </Link>
      </div>

      <div className="flex p-1 bg-slate-800/50 rounded-2xl mb-8">
        <button 
          onClick={() => setAuthMode('login')}
          className={cn(
            "flex-1 py-3 text-xs font-bold uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2",
            authMode === 'login' ? "bg-slate-700 text-white shadow-sm" : "text-slate-400 hover:text-slate-300"
          )}
        >
          <LogIn size={16} />
          <span>Login</span>
        </button>
        <button 
          onClick={() => setAuthMode('signup')}
          className={cn(
            "flex-1 py-3 text-xs font-bold uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2",
            authMode === 'signup' ? "bg-slate-700 text-white shadow-sm" : "text-slate-400 hover:text-slate-300"
          )}
        >
          <UserPlus size={16} />
          <span>Sign Up</span>
        </button>
      </div>

      {resetSent && (
        <div className="p-4 rounded-2xl mb-6 text-sm font-medium border bg-emerald-500/10 border-emerald-500/20 text-emerald-400 flex items-start gap-3">
          <Mail className="shrink-0 mt-0.5" size={18} />
          <p>Password reset link sent to your email.</p>
        </div>
      )}

      {authError && (
        <div className="p-4 rounded-2xl mb-6 text-sm font-medium border bg-red-500/10 border-red-500/20 text-red-400 flex items-start gap-3">
          <AlertCircle className="shrink-0 mt-0.5" size={18} />
          <p>{authError}</p>
        </div>
      )}

      <form onSubmit={handleAuth} className="space-y-4">
        {authMode === 'signup' && (
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
            <input 
              name="name" 
              type="text" 
              required 
              placeholder="Admin Name"
              className="w-full px-5 py-4 bg-slate-800/50 border border-white/10 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-medium text-white placeholder:text-slate-600"
            />
          </div>
        )}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Admin Email</label>
          <input 
            name="email" 
            type="email" 
            required 
            placeholder="admin@police.gov"
            className="w-full px-5 py-4 bg-slate-800/50 border border-white/10 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-medium text-white placeholder:text-slate-600"
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Password</label>
          <input 
            name="password" 
            type="password" 
            required 
            placeholder="••••••••"
            className="w-full px-5 py-4 bg-slate-800/50 border border-white/10 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-medium text-white placeholder:text-slate-600"
          />
        </div>

        {authMode === 'signup' && (
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Assigned Police Station</label>
            <div className="relative">
              <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <select 
                name="stationId" 
                className="w-full pl-12 pr-5 py-4 bg-slate-800/50 border border-white/10 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-medium appearance-none text-white"
              >
                <option value="" className="bg-slate-900">General Admin (All Stations)</option>
                {POLICE_STATIONS.map(s => <option key={s.id} value={s.id} className="bg-slate-900">{s.name}</option>)}
              </select>
            </div>
          </div>
        )}

        {authMode === 'login' && (
          <div className="flex justify-end">
            <button 
              type="button"
              onClick={handleForgotPassword}
              className="text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors uppercase tracking-widest"
            >
              Forgot Password?
            </button>
          </div>
        )}

        <button 
          type="submit"
          disabled={isSigningIn}
          className="w-full py-4 vibrant-gradient text-white font-bold rounded-2xl hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-xl shadow-indigo-500/20 disabled:opacity-50 glow-indigo"
        >
          {isSigningIn ? "Processing..." : (
            <>
              {authMode === 'login' ? <LogIn size={20} /> : <UserPlus size={20} />}
              <span>{authMode === 'login' ? 'Admin Login' : 'Create Admin Account'}</span>
            </>
          )}
        </button>
      </form>

      <div className="relative my-8">
        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10"></div></div>
        <div className="relative flex justify-center text-xs uppercase"><span className="bg-[#0f172a] px-4 text-slate-500 font-bold tracking-widest">Or Secure Sign In</span></div>
      </div>

      <button 
        onClick={handleGoogleSignIn}
        disabled={isSigningIn}
        className="w-full py-4 bg-slate-800/50 border border-white/10 text-white font-bold rounded-2xl hover:bg-slate-800 transition-all flex items-center justify-center gap-3 shadow-sm disabled:opacity-50"
      >
        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
        <span>Sign in with Google</span>
      </button>

      <p className="mt-8 text-center text-xs text-slate-500 font-medium">
        Unauthorized access is strictly prohibited and monitored.
      </p>
    </AuthLayout>
  );
};
