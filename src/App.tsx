
import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, onSnapshot, query, collection, orderBy, where, addDoc, serverTimestamp, updateDoc, getDocs, setDoc, getDocFromServer } from 'firebase/firestore';
import { auth, db } from './firebase';
import { UserProfile, Complaint, Notification } from './types';
import { AdminLogin } from './components/AdminLogin';
import { UserLogin } from './components/UserLogin';
import { Dashboard } from './components/Dashboard';
import { ErrorBoundary, handleFirestoreError, OperationType } from './lib/error-handling';
import { ADMIN_EMAILS, isDefaultAdminEmail, POLICE_STATIONS } from './constants';
import { Clock, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}

function AppContent() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const navigate = useNavigate();
  const location = useLocation();

  // Auth & Profile Sync
  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;

    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error: any) {
        if (error.message?.includes('the client is offline')) {
          console.error("Firestore is offline. Check configuration.");
        }
      }
    };
    testConnection();

    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }

      if (firebaseUser) {
        const docRef = doc(db, 'users', firebaseUser.uid);
        unsubscribeProfile = onSnapshot(docRef, async (docSnap) => {
          if (docSnap.exists()) {
            const profileData = docSnap.data() as UserProfile;
            
            // Auto-upgrade to admin if in default list
            if (profileData.role !== 'admin' && isDefaultAdminEmail(firebaseUser.email)) {
              try {
                await updateDoc(docRef, { role: 'admin' });
              } catch (error) {
                console.error("Failed to upgrade admin role:", error);
              }
            }
            
            setProfile(profileData);
          } else {
            // Handle missing profile for default admins
            if (isDefaultAdminEmail(firebaseUser.email)) {
              try {
                const newUser: UserProfile = {
                  uid: firebaseUser.uid,
                  name: firebaseUser.displayName || 'System Admin',
                  email: firebaseUser.email || '',
                  role: 'admin',
                  createdAt: serverTimestamp(),
                };
                await setDoc(docRef, newUser);
              } catch (error) {
                console.error("Failed to create missing admin profile:", error);
              }
            } else {
              setProfile(null);
            }
          }
          setLoading(false);
        }, (error) => {
          handleFirestoreError(error, OperationType.GET, 'users');
          setLoading(false);
        });
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  // Navigation Logic
  useEffect(() => {
    if (loading) return;

    const isAuthRoute = location.pathname === '/' || location.pathname === '/login' || location.pathname === '/admin/login';
    const isProtectedRoute = location.pathname.includes('dashboard') || location.pathname.includes('profile');

    if (user) {
      if (profile) {
        if (isAuthRoute) {
          if (profile.role === 'admin') {
            navigate('/admin/dashboard', { replace: true });
          } else if (location.pathname !== '/admin/login') {
            navigate('/dashboard', { replace: true });
          }
        } else if (profile.role === 'admin' && location.pathname === '/dashboard') {
          navigate('/admin/dashboard', { replace: true });
        } else if (profile.role === 'user' && location.pathname === '/admin/dashboard') {
          navigate('/dashboard', { replace: true });
        }
      } else {
        // User exists in Auth but not in Firestore yet (e.g. during signup)
        // We stay on the current page and wait for profile
      }
    } else if (isProtectedRoute) {
      if (location.pathname.startsWith('/admin')) {
        navigate('/admin/login', { replace: true });
      } else {
        navigate('/login', { replace: true });
      }
    }
  }, [user, profile, loading, location.pathname, navigate]);

  // Complaints Sync
  useEffect(() => {
    if (!profile || !profile.uid) return;

    let q;
    if (profile.role === 'admin') {
      q = query(collection(db, 'complaints'));
    } else {
      q = query(collection(db, 'complaints'), where('userId', '==', profile.uid));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Complaint));
      // Sort in memory to avoid index requirements
      docs.sort((a, b) => {
        const dateA = a.createdAt?.seconds || 0;
        const dateB = b.createdAt?.seconds || 0;
        return dateB - dateA;
      });
      setComplaints(docs);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'complaints');
    });

    return unsubscribe;
  }, [profile]);

  // Notifications Sync
  useEffect(() => {
    if (!profile || !profile.uid) return;

    const q = profile.role === 'admin' 
      ? query(collection(db, 'notifications'), where('userId', 'in', [profile.uid, 'admin']))
      : query(collection(db, 'notifications'), where('userId', '==', profile.uid));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
      // Sort in memory to avoid index requirements
      docs.sort((a, b) => {
        const dateA = a.createdAt?.seconds || 0;
        const dateB = b.createdAt?.seconds || 0;
        return dateB - dateA;
      });
      setNotifications(docs);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'notifications');
    });

    return unsubscribe;
  }, [profile]);

  const createNotification = async (userId: string, title: string, message: string, type: 'status_change' | 'new_report', complaintId?: string) => {
    try {
      await addDoc(collection(db, 'notifications'), {
        userId,
        title,
        message,
        type,
        complaintId: complaintId || null,
        read: false,
        createdAt: serverTimestamp(),
      });
    } catch (error: any) {
      handleFirestoreError(error, OperationType.WRITE, 'notifications');
    }
  };

  const markNotificationAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, 'notifications', id), {
        read: true
      });
    } catch (error: any) {
      handleFirestoreError(error, OperationType.UPDATE, `notifications/${id}`);
    }
  };

  const handleReport = async (e: React.FormEvent<HTMLFormElement>, showReportModal: 'lost' | 'found' | null, location?: { lat: number, lng: number }, imageUrl?: string | null) => {
    e.preventDefault();
    
    const formData = new FormData(e.currentTarget);
    const type = showReportModal as 'lost' | 'found';
    const category = formData.get('category') as string;
    const description = formData.get('description') as string;
    const stationId = formData.get('stationId') as string;
    const station = POLICE_STATIONS.find(s => s.id === stationId);

    try {
      const docRef = await addDoc(collection(db, 'complaints'), {
        userId: profile?.uid || 'anonymous',
        userName: profile?.name || 'Anonymous User',
        type,
        category,
        description,
        imageUrl: imageUrl || null,
        status: 'pending',
        assignedStationId: stationId,
        assignedStationName: station?.name || stationId,
        location: location || null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Notify Admins
      await addDoc(collection(db, 'notifications'), {
        userId: 'admin',
        title: 'New Report Submitted',
        message: `A new ${type} item (${category}) has been reported.`,
        type: 'new_report',
        complaintId: docRef.id,
        read: false,
        createdAt: serverTimestamp(),
      });

    } catch (error: any) {
      handleFirestoreError(error, OperationType.WRITE, 'complaints');
    }
  };

  const updateComplaintStatus = async (id: string, status: Complaint['status'], message?: string, internalNotes?: string) => {
    try {
      const complaintRef = doc(db, 'complaints', id);
      const complaintSnap = await getDoc(complaintRef);
      
      if (!complaintSnap.exists()) return;
      const complaintData = complaintSnap.data() as Complaint;

      await updateDoc(complaintRef, {
        status,
        adminMessage: message || '',
        internalNotes: internalNotes || '',
        updatedAt: serverTimestamp(),
        resolvedAt: status === 'resolved' ? serverTimestamp() : null
      });

      // Notify User
      await addDoc(collection(db, 'notifications'), {
        userId: complaintData.userId,
        title: 'Report Status Updated',
        message: `Your report for ${complaintData.category} is now ${status}.`,
        type: 'status_change',
        complaintId: id,
        read: false,
        createdAt: serverTimestamp(),
      });

    } catch (error: any) {
      handleFirestoreError(error, OperationType.UPDATE, `complaints/${id}`);
    }
  };

  const reassignComplaint = async (id: string, stationId: string) => {
    const station = POLICE_STATIONS.find(s => s.id === stationId);
    if (!station) return;

    try {
      await updateDoc(doc(db, 'complaints', id), {
        assignedStationId: stationId,
        assignedStationName: station.name,
        updatedAt: serverTimestamp()
      });

      const complaint = complaints.find(c => c.id === id);
      if (complaint) {
        await addDoc(collection(db, 'notifications'), {
          userId: complaint.userId,
          title: 'Report Reassigned',
          message: `Your report for ${complaint.category} has been reassigned to ${station.name}.`,
          type: 'status_change',
          complaintId: id,
          read: false,
          createdAt: serverTimestamp(),
        });
      }
    } catch (error: any) {
      handleFirestoreError(error, OperationType.UPDATE, `complaints/${id}`);
    }
  };

  const isAuthRoute = location.pathname === '/' || location.pathname === '/login' || location.pathname === '/admin/login';

  if (loading || (user && !profile && !isAuthRoute)) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-[#020617] relative overflow-hidden">
        {/* Background Blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/20 blur-[120px] animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/20 blur-[120px] animate-pulse" style={{ animationDelay: '-2s' }} />
        </div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative z-10 flex flex-col items-center"
        >
          <div className="relative">
            <div className="w-32 h-32 vibrant-gradient rounded-[2.5rem] flex items-center justify-center mb-8 shadow-2xl shadow-indigo-500/40 rotate-12 glow-indigo animate-float relative z-10 overflow-hidden group">
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
              <ShieldCheck className="text-white w-16 h-16 relative z-10" />
            </div>
            {/* Orbiting rings */}
            <div className="absolute inset-0 -m-4 border-2 border-indigo-500/20 rounded-[3rem] animate-spin-slow" />
            <div className="absolute inset-0 -m-8 border border-purple-500/10 rounded-[4rem] animate-reverse-spin" />
          </div>

          <div className="text-center space-y-4">
            <h2 className="text-4xl font-black text-white tracking-tighter uppercase">
              Secure<span className="text-indigo-500">Trace</span>
            </h2>
            <div className="flex flex-col items-center gap-2">
              <p className="text-slate-400 font-black uppercase tracking-[0.3em] text-xs">
                {user && !profile ? "Finalizing Digital Identity" : "Initializing Neural Link"}
              </p>
              <div className="w-48 h-1 bg-white/5 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ x: '-100%' }}
                  animate={{ x: '100%' }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                  className="w-1/2 h-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.8)]"
                />
              </div>
            </div>
            
            {user && !profile && (
              <motion.button 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 2 }}
                onClick={() => auth.signOut()}
                className="mt-8 px-6 py-2 bg-white/5 hover:bg-white/10 text-xs font-black text-indigo-400 hover:text-indigo-300 transition-all uppercase tracking-[0.2em] rounded-full border border-white/5"
              >
                Emergency Disconnect
              </motion.button>
            )}
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative">
      <div className="blob-container">
        <div className="blob w-[500px] h-[500px] bg-indigo-600/20 -top-20 -left-20" />
        <div className="blob w-[400px] h-[400px] bg-purple-600/20 top-1/4 -right-20" style={{ animationDelay: '-5s' }} />
        <div className="blob w-[600px] h-[600px] bg-blue-600/20 -bottom-20 left-1/3" style={{ animationDelay: '-10s' }} />
        <div className="blob w-[300px] h-[300px] bg-pink-600/20 top-1/2 left-10" style={{ animationDelay: '-15s' }} />
      </div>

      <Routes>
      <Route 
        path="/login" 
        element={
          user && profile?.role === 'user' ? (
            <Navigate to="/dashboard" />
          ) : user && profile?.role === 'admin' ? (
            <Navigate to="/admin/dashboard" />
          ) : (
            <UserLogin />
          )
        } 
      />
      <Route 
        path="/admin/login" 
        element={
          user && profile?.role === 'admin' ? (
            <Navigate to="/admin/dashboard" />
          ) : (
            <AdminLogin />
          )
        } 
      />
      
      <Route 
        path="/dashboard" 
        element={
          user && profile?.role === 'user' ? (
            <Dashboard 
              profile={profile} 
              complaints={complaints} 
              notifications={notifications}
              handleReport={handleReport} 
              updateComplaintStatus={updateComplaintStatus} 
              reassignComplaint={reassignComplaint}
              markNotificationAsRead={markNotificationAsRead}
            />
          ) : user && profile?.role === 'admin' ? (
            <Navigate to="/admin/dashboard" />
          ) : (
            <Navigate to="/login" />
          )
        } 
      />
      
      <Route 
        path="/admin/dashboard" 
        element={
          user && profile?.role === 'admin' ? (
            <Dashboard 
              profile={profile} 
              complaints={complaints} 
              notifications={notifications}
              handleReport={handleReport} 
              updateComplaintStatus={updateComplaintStatus} 
              reassignComplaint={reassignComplaint}
              markNotificationAsRead={markNotificationAsRead}
            />
          ) : user && profile?.role === 'user' ? (
            <Navigate to="/dashboard" />
          ) : (
            <Navigate to="/admin/login" />
          )
        } 
      />

      <Route path="/" element={<Navigate to={user ? (profile?.role === 'admin' ? "/admin/dashboard" : "/dashboard") : "/login"} />} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
    </div>
  );
}
