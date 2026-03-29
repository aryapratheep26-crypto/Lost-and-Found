
import React, { useState } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  GoogleAuthProvider, 
  signInWithPopup,
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import { auth, db } from '../firebase';
import { AuthLayout } from './AuthLayout';
import { AlertCircle, LogIn, UserPlus, Building2, ShieldCheck, Mail } from 'lucide-react';
import { cn } from '../lib/utils';
import { POLICE_STATIONS } from '../constants';
import { UserProfile } from '../types';

interface UserLoginProps {}

export const UserLogin: React.FC<UserLoginProps> = () => {
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
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const newUser: UserProfile = {
          uid: userCredential.user.uid,
          name: name || 'User',
          email,
          role: 'user',
          createdAt: serverTimestamp(),
          nearestStationId: stationId
        };
        await setDoc(doc(db, 'users', userCredential.user.uid), newUser);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (error: any) {
      if (error.code === 'auth/invalid-credential') {
        setAuthError("Invalid email or password. Please try again.");
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
      setAuthError("Please enter your email first to reset password");
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
      
      const docRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        const newUser: UserProfile = {
          uid: user.uid,
          name: user.displayName || 'User',
          email: user.email || '',
          role: 'user',
          createdAt: serverTimestamp(),
        };
        await setDoc(docRef, newUser);
      }
    } catch (error: any) {
      setAuthError(error.message);
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <AuthLayout title="State L&F" subtitle="Secure Lost & Found Portal">
      <div className="flex p-1 bg-slate-800/50 backdrop-blur-sm rounded-2xl mb-8">
        <button 
          onClick={() => setAuthMode('login')}
          className={cn("flex-1 py-2.5 text-sm font-bold rounded-xl transition-all", authMode === 'login' ? "bg-slate-700 text-indigo-400 shadow-sm" : "text-slate-400 hover:text-slate-300")}
        >
          Login
        </button>
        <button 
          onClick={() => setAuthMode('signup')}
          className={cn("flex-1 py-2.5 text-sm font-bold rounded-xl transition-all", authMode === 'signup' ? "bg-slate-700 text-indigo-400 shadow-sm" : "text-slate-400 hover:text-slate-300")}
        >
          Sign Up
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
              placeholder="John Doe"
              className="w-full px-5 py-4 bg-slate-800/50 border border-white/10 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-medium text-white placeholder:text-slate-600"
            />
          </div>
        )}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
          <input 
            name="email" 
            type="email" 
            required 
            placeholder="john@example.com"
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
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Nearest Police Station</label>
            <div className="relative">
              <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <select 
                name="stationId" 
                className="w-full pl-12 pr-5 py-4 bg-slate-800/50 border border-white/10 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-medium appearance-none text-white"
              >
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
              <span>{authMode === 'login' ? 'Login' : 'Create Account'}</span>
            </>
          )}
        </button>
      </form>

      <div className="relative my-8">
        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10"></div></div>
        <div className="relative flex justify-center text-xs uppercase"><span className="bg-[#0f172a] px-4 text-slate-500 font-bold tracking-widest">Or Continue With</span></div>
      </div>

      <button 
        onClick={handleGoogleSignIn}
        disabled={isSigningIn}
        className="w-full py-4 bg-slate-800/50 border border-white/10 text-white font-bold rounded-2xl hover:bg-slate-800 transition-all flex items-center justify-center gap-3 shadow-sm disabled:opacity-50"
      >
        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
        <span>Continue with Google</span>
      </button>

      <div className="mt-8 pt-8 border-t border-white/10 text-center">
        <Link 
          to="/admin/login" 
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-indigo-400 transition-colors uppercase tracking-widest"
        >
          <ShieldCheck size={14} />
          <span>Police Admin Login</span>
        </Link>
      </div>
    </AuthLayout>
  );
};
