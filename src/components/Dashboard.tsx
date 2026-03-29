
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { 
  BarChart3, 
  FileText, 
  User as UserIcon, 
  LogOut, 
  Plus, 
  Search, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  ChevronRight, 
  Filter, 
  ShieldCheck,
  Building2,
  Mail,
  Phone,
  MapPin,
  X,
  Bell,
  BellDot,
  Quote,
  MessageSquare,
  XCircle,
  Shield,
  FileSearch,
  History,
  LayoutDashboard,
  Image as ImageIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { cn } from '../lib/utils';
import { auth, storage } from '../firebase';
import { signOut } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { UserProfile, Complaint, Notification } from '../types';
import { CATEGORIES, POLICE_STATIONS } from '../constants';
import { MapPicker } from './MapPicker';
import { MapView } from './MapView';
import { ReportModal } from './ReportModal';

interface DashboardProps {
  profile: UserProfile | null;
  complaints: Complaint[];
  notifications: Notification[];
  handleReport: (e: React.FormEvent<HTMLFormElement>, showReportModal: 'lost' | 'found' | null, location?: { lat: number, lng: number }, imageUrl?: string | null) => Promise<void>;
  updateComplaintStatus: (id: string, status: Complaint['status'], message?: string, internalNotes?: string) => Promise<void>;
  reassignComplaint: (id: string, stationId: string) => Promise<void>;
  markNotificationAsRead: (id: string) => Promise<void>;
}

export const Dashboard: React.FC<DashboardProps> = ({ profile, complaints, notifications, handleReport, updateComplaintStatus, reassignComplaint, markNotificationAsRead }) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'reports' | 'profile'>('dashboard');
  const [showReportModal, setShowReportModal] = useState<'lost' | 'found' | null>(null);
  const [reportLocation, setReportLocation] = useState<{ lat: number, lng: number } | null>(null);
  const [viewingComplaint, setViewingComplaint] = useState<Complaint | null>(null);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);

  const unreadCount = notifications.filter(n => !n.read).length;

  const content = (
    <div className="min-h-screen pb-24 lg:pb-0 lg:pl-64 relative overflow-hidden">
      {/* Decorative Organic Shapes */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-500/5 organic-shape-1 -z-10 blur-3xl" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-purple-500/5 organic-shape-2 -z-10 blur-3xl" />

      {/* Sidebar (Desktop) */}
      <aside className="hidden lg:flex flex-col fixed inset-y-0 left-0 w-64 glass-card m-4 rounded-[3rem] p-8 premium-shadow z-50">
        <div className="flex items-center gap-4 mb-12 group cursor-pointer">
          <div className="w-14 h-14 vibrant-gradient rounded-[1.5rem] flex items-center justify-center shadow-2xl shadow-indigo-500/40 transition-all group-hover:scale-110 group-hover:rotate-12 glow-indigo shimmer">
            <ShieldCheck className="text-white w-8 h-8" />
          </div>
          <span className="font-black text-2xl text-white tracking-tighter">State L&F</span>
        </div>

        <nav className="flex-1 space-y-3">
          <SidebarLink icon={BarChart3} label="Dashboard" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
          <SidebarLink icon={FileText} label={profile?.role === 'admin' ? "All Reports" : "My Reports"} active={activeTab === 'reports'} onClick={() => setActiveTab('reports')} />
          <SidebarLink icon={UserIcon} label="Profile" active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} />
        </nav>

        <button 
          onClick={() => signOut(auth)}
          className="flex items-center gap-4 p-5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-[1.5rem] transition-all font-black text-sm uppercase tracking-widest"
        >
          <LogOut size={20} />
          <span>Sign Out</span>
        </button>
      </aside>

      {/* Mobile Nav */}
      <nav className="lg:hidden fixed bottom-4 inset-x-4 glass-card rounded-3xl flex justify-around p-4 z-50">
        <MobileNavLink icon={BarChart3} active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
        <MobileNavLink icon={FileText} active={activeTab === 'reports'} onClick={() => setActiveTab('reports')} />
        <MobileNavLink icon={UserIcon} active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} />
        <button onClick={() => signOut(auth)} className="p-2 text-slate-400 hover:text-rose-400 transition-all"><LogOut size={24} /></button>
      </nav>

      {/* Main Content */}
      <main className="p-6 lg:p-10 max-w-6xl mx-auto">
        <header className="flex items-center justify-between mb-12">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="text-4xl font-black text-white tracking-tighter">Welcome, {profile?.name}</h1>
            <p className="text-slate-400 font-bold text-lg flex items-center gap-2">
              {profile?.role === 'admin' ? (
                <>
                  <ShieldCheck className="text-indigo-400 w-5 h-5" />
                  Police Administrator Portal
                </>
              ) : (
                <>
                  <UserIcon className="text-indigo-400 w-5 h-5" />
                  Public Assistance Portal
                </>
              )}
            </p>
          </motion.div>
          <div className="hidden sm:flex items-center gap-6">
            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="w-10 h-10 glass-card rounded-xl flex items-center justify-center text-slate-400 hover:text-indigo-400 transition-all relative"
              >
                {unreadCount > 0 ? <BellDot size={20} className="text-indigo-400" /> : <Bell size={20} />}
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-slate-900">
                    {unreadCount}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {showNotifications && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-4 w-80 glass-card rounded-3xl shadow-2xl z-[60] overflow-hidden border border-white/5"
                  >
                    <div className="p-4 border-b border-white/5 flex items-center justify-between bg-slate-800/40">
                      <h4 className="font-bold text-white">Notifications</h4>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{unreadCount} New</span>
                    </div>
                    <div className="max-h-96 overflow-y-auto divide-y divide-white/5">
                      {notifications.length > 0 ? (
                        notifications.map(notification => (
                          <div 
                            key={notification.id} 
                            onClick={() => {
                              markNotificationAsRead(notification.id);
                              const complaint = complaints.find(c => c.id === notification.complaintId);
                              if (complaint) setViewingComplaint(complaint);
                              setShowNotifications(false);
                            }}
                            className={cn(
                              "p-4 hover:bg-white/5 transition-all cursor-pointer group",
                              !notification.read && "bg-indigo-500/10"
                            )}
                          >
                            <div className="flex gap-3">
                              <div className={cn(
                                "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                                notification.type === 'new_report' ? "bg-emerald-500/10 text-emerald-400" : "bg-blue-500/10 text-blue-400"
                              )}>
                                {notification.type === 'new_report' ? <Plus size={14} /> : <Clock size={14} />}
                              </div>
                              <div>
                                <p className="text-xs font-bold text-white group-hover:text-indigo-400 transition-colors">{notification.title}</p>
                                <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-2">{notification.message}</p>
                                <p className="text-[9px] text-slate-500 mt-1 font-medium">{format(notification.createdAt?.toDate?.() || new Date(), 'MMM d, HH:mm')}</p>
                              </div>
                              {!notification.read && (
                                <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full shrink-0 mt-1.5" />
                              )}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-8 text-center">
                          <Bell className="mx-auto text-slate-700 mb-2" size={32} />
                          <p className="text-xs text-slate-500 font-medium">No notifications yet</p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="glass-card p-2 rounded-2xl">
              <div className="w-10 h-10 vibrant-gradient rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-500/20">
                {profile?.name?.[0]}
              </div>
            </div>
          </div>
        </header>

        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="space-y-8"
            >
              {profile?.role === 'admin' ? (
                <AdminDashboard 
                  complaints={complaints} 
                  onUpdate={updateComplaintStatus} 
                  selectedComplaint={selectedComplaint}
                  setSelectedComplaint={setSelectedComplaint}
                  reassignComplaint={reassignComplaint}
                />
              ) : (
                <UserDashboard 
                  complaints={complaints} 
                  onReportLost={() => setShowReportModal('lost')} 
                  onReportFound={() => setShowReportModal('found')} 
                  onSelect={setViewingComplaint}
                />
              )}
            </motion.div>
          )}

          {activeTab === 'reports' && (
            <motion.div 
              key="reports"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
            >
              <ReportsList 
                complaints={complaints} 
                role={profile?.role || 'user'} 
                onSelect={(c) => profile?.role === 'admin' ? setSelectedComplaint(c) : setViewingComplaint(c)} 
                profile={profile}
              />
            </motion.div>
          )}

          {activeTab === 'profile' && (
            <motion.div 
              key="profile"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
            >
              <ProfileSection profile={profile} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Modals */}
      <AnimatePresence>
        <ReportModal 
          isOpen={showReportModal}
          onClose={() => setShowReportModal(null)}
          onSubmit={handleReport}
        />

        {viewingComplaint && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="glass-card w-full max-w-3xl rounded-[4rem] shadow-2xl overflow-hidden border-none premium-shadow relative"
            >
              <div className="absolute top-0 left-0 w-64 h-64 vibrant-gradient opacity-10 blur-[100px] -ml-32 -mt-32" />
              
              <div className="p-10 border-b border-white/5 flex items-center justify-between bg-white/5 backdrop-blur-2xl relative z-10">
                <div className="flex items-center gap-6">
                  <div className={cn(
                    "w-16 h-16 rounded-[1.5rem] flex items-center justify-center flex-shrink-0 shadow-2xl transition-all duration-500 group-hover:scale-110 group-hover:rotate-12",
                    viewingComplaint.type === 'lost' ? "bg-rose-500 text-white glow-rose" : "bg-emerald-500 text-white glow-emerald"
                  )}>
                    {viewingComplaint.type === 'lost' ? <AlertCircle size={32} /> : <Search size={32} />}
                  </div>
                  <div>
                    <h3 className="text-3xl font-black text-white tracking-tighter leading-tight">{viewingComplaint.category}</h3>
                    <p className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] mt-2">
                      {viewingComplaint.type} Item • {format(viewingComplaint.createdAt?.toDate?.() || new Date(), 'MMM d, yyyy')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <StatusBadge status={viewingComplaint.status} />
                  <button onClick={() => setViewingComplaint(null)} className="w-12 h-12 flex items-center justify-center hover:bg-white/10 rounded-2xl transition-all text-slate-500 hover:text-white border border-white/5 shadow-xl"><X size={28} /></button>
                </div>
              </div>

              <div className="p-10 space-y-10 max-h-[75vh] overflow-y-auto custom-scrollbar relative z-10">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                  <div className="space-y-8">
                    <section>
                      <h4 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] mb-4 ml-2 flex items-center gap-2">
                        <FileText size={16} className="text-indigo-400" />
                        Detailed Description
                      </h4>
                      <div className="bg-white/5 p-8 rounded-[2.5rem] border border-white/10 shadow-inner relative overflow-hidden group">
                        <Quote size={40} className="text-white/5 absolute -top-4 -left-4" />
                        <p className="text-slate-200 leading-relaxed font-bold text-lg relative z-10 italic">
                          "{viewingComplaint.description}"
                        </p>
                      </div>
                    </section>

                    {viewingComplaint.imageUrl && (
                      <section>
                        <h4 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] mb-4 ml-2 flex items-center gap-2">
                          <ImageIcon size={16} className="text-indigo-400" />
                          Item Image
                        </h4>
                        <div className="rounded-[2.5rem] overflow-hidden border border-white/10 shadow-2xl relative group">
                          <img src={viewingComplaint.imageUrl} alt="Item" className="w-full h-auto object-cover" referrerPolicy="no-referrer" />
                        </div>
                      </section>
                    )}

                    <section>
                      <h4 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] mb-4 ml-2 flex items-center gap-2">
                        <Building2 size={16} className="text-indigo-400" />
                        Assigned Jurisdiction
                      </h4>
                      <div className="flex items-center gap-6 p-6 bg-white/5 rounded-[2.5rem] border border-white/10 shadow-xl group hover:bg-white/10 transition-all duration-500">
                        <div className="w-16 h-16 bg-indigo-500/20 rounded-2xl flex items-center justify-center text-indigo-400 shadow-2xl border border-indigo-500/20 group-hover:scale-110 group-hover:rotate-6 transition-all">
                          <Building2 size={32} />
                        </div>
                        <div>
                          <p className="text-xl font-black text-white tracking-tight">{viewingComplaint.assignedStationName}</p>
                          <p className="text-xs text-slate-500 font-bold uppercase tracking-[0.2em] mt-1">Official Handling Point</p>
                        </div>
                      </div>
                    </section>

                    {viewingComplaint.adminMessage && (
                      <section>
                        <h4 className="text-xs font-black text-indigo-400 uppercase tracking-[0.2em] mb-4 ml-2 flex items-center gap-2">
                          <ShieldCheck size={16} />
                          Official Police Directive
                        </h4>
                        <div className="bg-indigo-500/10 p-8 rounded-[2.5rem] border border-indigo-500/20 shadow-2xl relative overflow-hidden group">
                          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-3xl -mr-16 -mt-16" />
                          <p className="text-indigo-200 text-lg leading-relaxed font-bold italic relative z-10 group-hover:text-white transition-colors">
                            "{viewingComplaint.adminMessage}"
                          </p>
                        </div>
                      </section>
                    )}
                  </div>

                  <div className="space-y-8">
                    <section>
                      <h4 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] mb-4 ml-2 flex items-center gap-2">
                        <MapPin size={16} className="text-indigo-400" />
                        Geospatial Context
                      </h4>
                      <div className="space-y-6">
                        {viewingComplaint.location ? (
                          <>
                            <div className="rounded-[3rem] overflow-hidden border border-white/10 shadow-2xl h-72 relative group/map">
                              <MapView location={viewingComplaint.location} title={viewingComplaint.category} />
                              <div className="absolute inset-0 bg-indigo-500/5 pointer-events-none group-hover/map:opacity-0 transition-opacity duration-500" />
                            </div>
                            <div className="flex items-start gap-4 text-slate-400 bg-white/5 p-6 rounded-[2rem] border border-white/5 shadow-inner">
                              <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center shrink-0">
                                <MapPin size={20} className="text-indigo-400" />
                              </div>
                              <div>
                                <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 mb-1">Coordinates</p>
                                <p className="text-sm font-bold text-slate-300 leading-tight">
                                  {viewingComplaint.location.lat.toFixed(6)}, {viewingComplaint.location.lng.toFixed(6)}
                                </p>
                              </div>
                            </div>
                          </>
                        ) : (
                          <div className="bg-white/5 p-12 rounded-[3rem] border-2 border-dashed border-white/10 text-center shadow-inner">
                            <MapPin className="mx-auto text-slate-700 mb-4 opacity-20" size={48} />
                            <p className="text-sm text-slate-500 font-black uppercase tracking-[0.2em]">No location data provided</p>
                          </div>
                        )}
                      </div>
                    </section>

                    <section className="pt-8 border-t border-white/5">
                      <div className="flex items-center justify-between text-slate-500 bg-white/5 p-6 rounded-[2rem] border border-white/5">
                        <div className="flex items-center gap-3">
                          <Clock size={18} className="text-indigo-400" />
                          <span className="text-xs font-black uppercase tracking-[0.2em]">Last System Update</span>
                        </div>
                        <span className="text-sm font-black text-slate-300">{format(viewingComplaint.updatedAt?.toDate?.() || new Date(), 'MMM d, HH:mm')}</span>
                      </div>
                    </section>
                  </div>
                </div>
              </div>

              <div className="p-10 bg-white/5 border-t border-white/5 flex justify-end relative z-10">
                <button 
                  onClick={() => setViewingComplaint(null)}
                  className="group relative px-12 py-4 bg-white/5 text-white font-black rounded-2xl hover:bg-white/10 transition-all border border-white/10 shadow-xl overflow-hidden"
                >
                  <div className="absolute inset-0 bg-white/5 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                  <span className="relative z-10 text-lg uppercase tracking-[0.2em]">Close Archive</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );

  return content;
};

// --- Sub-Components ---

function SidebarLink({ icon: Icon, label, active, onClick }: { icon: any, label: string, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-4 p-4 rounded-[1.5rem] transition-all duration-500 group relative overflow-hidden",
        active 
          ? "bg-indigo-500/10 text-indigo-400 shadow-lg shadow-indigo-500/5 border border-indigo-500/20" 
          : "text-slate-400 hover:text-white hover:bg-white/5"
      )}
    >
      {active && (
        <motion.div 
          layoutId="sidebar-active"
          className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-transparent -z-10"
        />
      )}
      <Icon size={22} className={cn("transition-transform duration-500", active ? "scale-110" : "group-hover:scale-110 group-hover:rotate-6")} />
      <span className="font-black text-sm uppercase tracking-widest">{label}</span>
      {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-400 glow-indigo" />}
    </button>
  );
}

function MobileNavLink({ icon: Icon, active, onClick }: { icon: any, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "p-4 rounded-2xl transition-all duration-500 relative",
        active ? "text-indigo-400 bg-indigo-500/10" : "text-slate-400"
      )}
    >
      {active && (
        <motion.div 
          layoutId="mobile-active"
          className="absolute inset-0 bg-indigo-500/10 rounded-2xl -z-10"
        />
      )}
      <Icon size={24} className={cn("transition-all", active ? "scale-110" : "")} />
    </button>
  );
}

function UserDashboard({ complaints, onReportLost, onReportFound, onSelect }: { complaints: Complaint[], onReportLost: () => void, onReportFound: () => void, onSelect: (c: Complaint) => void }) {
  const pending = complaints.filter(c => c.status === 'pending' || c.status === 'under-review').length;
  const resolved = complaints.filter(c => c.status === 'resolved').length;

  return (
    <div className="space-y-12">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
        <motion.button 
          whileHover={{ y: -10, scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onReportLost}
          className="group relative h-72 glass-card rounded-[3.5rem] overflow-hidden border-none premium-shadow flex flex-col items-center justify-center gap-6 text-center p-10"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-rose-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
          <div className="w-24 h-24 bg-rose-500 text-white rounded-[2.5rem] flex items-center justify-center shadow-2xl shadow-rose-500/40 glow-rose transition-all duration-700 group-hover:rotate-12 group-hover:scale-110 group-hover:rounded-[3rem]">
            <AlertCircle size={48} />
          </div>
          <div>
            <h3 className="text-3xl font-black text-white tracking-tighter mb-2">Report Lost Item</h3>
            <p className="text-slate-400 font-black text-xs uppercase tracking-[0.2em]">Help us find what you've lost</p>
          </div>
          <div className="absolute bottom-8 right-10 w-14 h-14 rounded-full bg-white/5 flex items-center justify-center text-rose-400 group-hover:bg-rose-500 group-hover:text-white transition-all duration-500 shadow-xl">
            <Plus size={28} />
          </div>
        </motion.button>

        <motion.button 
          whileHover={{ y: -10, scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onReportFound}
          className="group relative h-72 glass-card rounded-[3.5rem] overflow-hidden border-none premium-shadow flex flex-col items-center justify-center gap-6 text-center p-10"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
          <div className="w-24 h-24 bg-emerald-500 text-white rounded-[2.5rem] flex items-center justify-center shadow-2xl shadow-emerald-500/40 glow-emerald transition-all duration-700 group-hover:-rotate-12 group-hover:scale-110 group-hover:rounded-[3rem]">
            <Search size={48} />
          </div>
          <div>
            <h3 className="text-3xl font-black text-white tracking-tighter mb-2">Report Found Item</h3>
            <p className="text-slate-400 font-black text-xs uppercase tracking-[0.2em]">Return something to its owner</p>
          </div>
          <div className="absolute bottom-8 right-10 w-14 h-14 rounded-full bg-white/5 flex items-center justify-center text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white transition-all duration-500 shadow-xl">
            <Plus size={28} />
          </div>
        </motion.button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
        <StatCard label="Pending" value={pending} icon={Clock} color="blue" />
        <StatCard label="Resolved" value={resolved} icon={CheckCircle} color="emerald" />
        <StatCard label="Total Reports" value={complaints.length} icon={FileText} color="slate" />
        <StatCard label="Active Alerts" value={2} icon={AlertCircle} color="orange" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
        <div className="md:col-span-2 space-y-10">
          <div className="flex items-center justify-between">
            <h2 className="text-3xl font-black text-white tracking-tighter">Recent Activity</h2>
            <button className="text-xs font-black text-indigo-400 uppercase tracking-[0.2em] hover:text-indigo-300 transition-colors">View All Reports</button>
          </div>
          <div className="space-y-6">
            {complaints.slice(0, 5).map(c => (
              <ComplaintItem key={c.id} complaint={c} onClick={() => onSelect(c)} />
            ))}
            {complaints.length === 0 && (
              <div className="glass-card p-20 text-center rounded-[3.5rem] border-dashed border-white/5">
                <div className="w-20 h-20 bg-white/5 rounded-[2rem] flex items-center justify-center mx-auto mb-6 opacity-20">
                  <FileText size={40} />
                </div>
                <p className="text-slate-500 font-black text-xl tracking-tight">No activity recorded yet.</p>
                <p className="text-slate-600 font-bold text-sm mt-2">Your reports will appear here once submitted.</p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-10">
          <h2 className="text-3xl font-black text-white tracking-tighter">Quick Stats</h2>
          <div className="grid grid-cols-1 gap-6">
            <StatCard label="Active Reports" value={pending} icon={Clock} color="blue" />
            <StatCard label="Resolved Items" value={resolved} icon={CheckCircle} color="emerald" />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: Complaint['status'] }) {
  const styles = {
    pending: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    'under-review': "bg-blue-500/10 text-blue-400 border-blue-500/20",
    resolved: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    rejected: "bg-red-500/10 text-red-400 border-red-500/20"
  };

  return (
    <span className={cn(
      "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border",
      styles[status]
    )}>
      {status.replace('-', ' ')}
    </span>
  );
}

function AdminDashboard({ 
  complaints, 
  onUpdate, 
  selectedComplaint, 
  setSelectedComplaint,
  reassignComplaint
}: { 
  complaints: Complaint[], 
  onUpdate: (id: string, status: Complaint['status'], msg?: string, internalNotes?: string) => Promise<void>,
  selectedComplaint: Complaint | null,
  setSelectedComplaint: (c: Complaint | null) => void,
  reassignComplaint: (id: string, stationId: string) => Promise<void>
}) {
  const [adminMsg, setAdminMsg] = useState('');
  const [internalNotes, setInternalNotes] = useState('');

  useEffect(() => {
    if (selectedComplaint) {
      setAdminMsg(selectedComplaint.adminMessage || '');
      setInternalNotes(selectedComplaint.internalNotes || '');
    }
  }, [selectedComplaint]);
  const [filterType, setFilterType] = useState<'all' | 'lost' | 'found'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'under-review' | 'resolved'>('all');

  const filtered = complaints.filter(c => {
    const typeMatch = filterType === 'all' || c.type === filterType;
    const statusMatch = filterStatus === 'all' || c.status === filterStatus;
    return typeMatch && statusMatch;
  });

  const stats = {
    pending: complaints.filter(c => c.status === 'pending').length,
    underReview: complaints.filter(c => c.status === 'under-review').length,
    resolved: complaints.filter(c => c.status === 'resolved').length,
    total: complaints.length
  };

  return (
    <div className="space-y-12">
      {/* Admin Stats Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
        <StatCard label="Pending" value={stats.pending} icon={Clock} color="orange" />
        <StatCard label="Under Review" value={stats.underReview} icon={Search} color="blue" />
        <StatCard label="Resolved" value={stats.resolved} icon={CheckCircle} color="emerald" />
        <StatCard label="Total Reports" value={stats.total} icon={FileText} color="slate" />
      </div>

      {/* Admin Controls & Filter */}
      <div className="glass-card p-10 rounded-[4rem] premium-shadow border-none relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 vibrant-gradient opacity-5 blur-[100px] -mr-32 -mt-32" />
        
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-8 mb-12">
          <div>
            <h2 className="text-4xl font-black text-white tracking-tighter flex items-center gap-4">
              <div className="w-14 h-14 vibrant-gradient rounded-[1.5rem] flex items-center justify-center shadow-2xl shadow-indigo-500/40 glow-indigo shimmer">
                <Filter size={28} className="text-white" />
              </div>
              Command Center
            </h2>
            <p className="text-slate-400 font-bold text-lg mt-2">Overseeing state-wide lost & found operations</p>
          </div>
          <div className="flex flex-wrap gap-4">
            <select 
              value={filterType} 
              onChange={(e) => setFilterType(e.target.value as any)}
              className="px-6 py-4 bg-white/5 backdrop-blur-xl border border-white/10 rounded-[1.5rem] text-xs font-black uppercase tracking-[0.2em] outline-none shadow-xl focus:ring-2 focus:ring-indigo-500/40 transition-all text-white cursor-pointer"
            >
              <option value="all">All Types</option>
              <option value="lost">Lost Items</option>
              <option value="found">Found Items</option>
            </select>
            <select 
              value={filterStatus} 
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="px-6 py-4 bg-white/5 backdrop-blur-xl border border-white/10 rounded-[1.5rem] text-xs font-black uppercase tracking-[0.2em] outline-none shadow-xl focus:ring-2 focus:ring-indigo-500/40 transition-all text-white cursor-pointer"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="under-review">Under Review</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5">
                <th className="pb-8 text-xs font-black text-slate-500 uppercase tracking-[0.2em] px-4">Report Details</th>
                <th className="pb-8 text-xs font-black text-slate-500 uppercase tracking-[0.2em] px-4">Citizen</th>
                <th className="pb-8 text-xs font-black text-slate-500 uppercase tracking-[0.2em] px-4">Station</th>
                <th className="pb-8 text-xs font-black text-slate-500 uppercase tracking-[0.2em] px-4">Status</th>
                <th className="pb-8 text-xs font-black text-slate-500 uppercase tracking-[0.2em] px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map(c => (
                <tr key={c.id} className="group hover:bg-white/5 transition-all duration-500">
                  <td className="py-8 px-4">
                    <div className="flex items-center gap-6">
                      <div className={cn(
                        "w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 shadow-2xl transition-all duration-500 group-hover:scale-110 group-hover:rotate-6",
                        c.type === 'lost' ? "bg-rose-500 text-white glow-rose" : "bg-emerald-500 text-white glow-emerald"
                      )}>
                        {c.type === 'lost' ? <AlertCircle size={28} /> : <Search size={28} />}
                      </div>
                      <div>
                        <p className="text-xl font-black text-white tracking-tight">{c.category}</p>
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-[0.2em] mt-1">{format(c.createdAt?.toDate?.() || new Date(), 'MMM d, yyyy')}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-8 px-4">
                    <p className="text-lg font-black text-slate-200 tracking-tight">{c.userName}</p>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-[0.2em] mt-1">ID: {c.userId.slice(0, 8)}</p>
                  </td>
                  <td className="py-8 px-4">
                    <div className="flex items-center gap-3 text-slate-400 bg-white/5 px-4 py-2 rounded-2xl w-fit border border-white/5 shadow-sm">
                      <Building2 size={18} className="text-indigo-400" />
                      <span className="text-xs font-black uppercase tracking-[0.2em]">{c.assignedStationName}</span>
                    </div>
                  </td>
                  <td className="py-8 px-4">
                    <StatusBadge status={c.status} />
                  </td>
                  <td className="py-8 px-4">
                    <div className="flex items-center justify-end gap-4">
                      <button 
                        onClick={() => setSelectedComplaint(c)}
                        className="w-12 h-12 flex items-center justify-center text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-2xl transition-all shadow-xl border border-white/5"
                        title="View Details"
                      >
                        <FileText size={22} />
                      </button>
                      {c.status !== 'resolved' && (
                        <button 
                          onClick={() => onUpdate(c.id, 'resolved', 'Item recovered and verified.')}
                          className="w-12 h-12 flex items-center justify-center text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-2xl transition-all shadow-xl border border-white/5"
                          title="Mark as Resolved"
                        >
                          <CheckCircle size={22} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="py-32 text-center bg-white/5 rounded-[4rem] border-2 border-dashed border-white/5 m-8">
              <FileText className="mx-auto mb-6 opacity-10" size={80} />
              <p className="text-slate-500 font-black text-2xl tracking-tight">No reports match your filters.</p>
              <p className="text-slate-600 font-bold mt-2">Try adjusting your selection to see more results.</p>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {selectedComplaint && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="glass-card w-full max-w-2xl rounded-[4rem] shadow-2xl overflow-hidden border-none premium-shadow relative"
            >
              <div className="absolute top-0 left-0 w-64 h-64 vibrant-gradient opacity-10 blur-[100px] -ml-32 -mt-32" />
              
              <div className="p-10 border-b border-white/5 flex items-center justify-between bg-white/5 backdrop-blur-2xl relative z-10">
                <div>
                  <h3 className="text-3xl font-black text-white tracking-tighter flex items-center gap-3">
                    <div className="w-10 h-10 vibrant-gradient rounded-xl flex items-center justify-center shadow-lg glow-indigo shimmer">
                      <ShieldCheck size={20} className="text-white" />
                    </div>
                    Command Action
                  </h3>
                  <p className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] mt-2">Reference ID: {selectedComplaint.id.slice(0, 16)}</p>
                </div>
                <button onClick={() => setSelectedComplaint(null)} className="w-12 h-12 flex items-center justify-center hover:bg-white/10 rounded-2xl transition-all text-slate-500 hover:text-white border border-white/5 shadow-xl"><X size={28} /></button>
              </div>
              
              <div className="p-10 space-y-10 relative z-10 max-h-[70vh] overflow-y-auto custom-scrollbar">
                <div className="bg-white/5 p-8 rounded-[3rem] border border-white/10 shadow-inner relative overflow-hidden group">
                  <div className={cn(
                    "absolute top-0 right-0 w-48 h-48 opacity-5 blur-[80px] -mr-24 -mt-24 transition-all duration-700 group-hover:scale-150 group-hover:opacity-10",
                    selectedComplaint.type === 'lost' ? "bg-rose-500" : "bg-emerald-500"
                  )} />
                  
                  {selectedComplaint.imageUrl && (
                    <div className="mb-8 rounded-[2rem] overflow-hidden border border-white/10 shadow-xl">
                      <img src={selectedComplaint.imageUrl} alt="Item" className="w-full h-64 object-cover" referrerPolicy="no-referrer" />
                    </div>
                  )}

                  <div className="flex flex-wrap justify-between items-center gap-4 mb-8">
                    <div className="flex items-center gap-3 bg-white/5 px-5 py-2.5 rounded-2xl border border-white/5 shadow-sm">
                      <UserIcon size={18} className="text-indigo-400" />
                      <span className="text-sm font-black text-slate-200 tracking-tight">{selectedComplaint.userName}</span>
                    </div>
                    <span className={cn(
                      "text-xs font-black uppercase tracking-[0.2em] px-5 py-2.5 rounded-2xl shadow-lg border border-white/10",
                      selectedComplaint.type === 'lost' ? "bg-rose-500/20 text-rose-400" : "bg-emerald-500/20 text-emerald-400"
                    )}>
                      {selectedComplaint.type} Report
                    </span>
                  </div>
                  
                  <div className="relative">
                    <Quote size={40} className="text-white/5 absolute -top-4 -left-4" />
                    <p className="text-slate-200 font-bold text-xl leading-relaxed mb-8 relative z-10 italic">"{selectedComplaint.description}"</p>
                  </div>
                  
                  {selectedComplaint.location && (
                    <div className="space-y-4">
                      <p className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-3">
                        <MapPin size={16} className="text-indigo-400" />
                        Geospatial Context
                      </p>
                      <div className="rounded-[2.5rem] overflow-hidden border border-white/10 shadow-2xl h-64 relative group/map">
                        <MapView location={selectedComplaint.location} title={selectedComplaint.category} />
                        <div className="absolute inset-0 bg-indigo-500/5 pointer-events-none group-hover/map:opacity-0 transition-opacity duration-500" />
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-[0.2em] ml-2 flex items-center gap-2">
                    <Building2 size={16} className="text-indigo-400" />
                    Reassign Station
                  </label>
                  <select 
                    value={selectedComplaint.assignedStationId || ''}
                    onChange={(e) => reassignComplaint(selectedComplaint.id, e.target.value)}
                    className="w-full px-8 py-6 bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500/40 outline-none transition-all font-bold text-slate-200 text-lg shadow-inner appearance-none"
                  >
                    <option value="" className="bg-slate-900">Select Station</option>
                    {POLICE_STATIONS.map(s => (
                      <option key={s.id} value={s.id} className="bg-slate-900">{s.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-4">
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-[0.2em] ml-2 flex items-center gap-2">
                    <ShieldCheck size={16} className="text-indigo-400" />
                    Internal Admin Notes (Private)
                  </label>
                  <textarea 
                    value={internalNotes}
                    onChange={(e) => setInternalNotes(e.target.value)}
                    rows={3} 
                    className="w-full px-8 py-6 bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500/40 outline-none transition-all font-bold text-slate-200 text-lg shadow-inner placeholder:text-slate-600" 
                    placeholder="Notes for other admins..."
                  ></textarea>
                </div>

                <div className="space-y-4">
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-[0.2em] ml-2 flex items-center gap-2">
                    <MessageSquare size={16} className="text-indigo-400" />
                    Official Response & Instructions
                  </label>
                  <textarea 
                    value={adminMsg}
                    onChange={(e) => setAdminMsg(e.target.value)}
                    rows={4} 
                    className="w-full px-8 py-6 bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500/40 outline-none transition-all font-bold text-slate-200 text-lg shadow-inner placeholder:text-slate-600" 
                    placeholder="Provide clear instructions for the citizen..."
                  ></textarea>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <button 
                    onClick={() => {
                      onUpdate(selectedComplaint.id, 'resolved', adminMsg, internalNotes);
                      setSelectedComplaint(null);
                    }}
                    className="group relative py-6 bg-emerald-500 text-white font-black rounded-[2rem] hover:bg-emerald-600 transition-all shadow-2xl shadow-emerald-500/30 glow-emerald overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                    <span className="relative z-10 flex items-center justify-center gap-3 text-lg">
                      <CheckCircle size={24} />
                      Authorize Resolution
                    </span>
                  </button>
                  <button 
                    onClick={() => {
                      onUpdate(selectedComplaint.id, 'rejected', adminMsg, internalNotes);
                      setSelectedComplaint(null);
                    }}
                    className="group relative py-6 bg-rose-500/10 text-rose-400 font-black rounded-[2rem] hover:bg-rose-500/20 transition-all border border-rose-500/20 shadow-xl overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-rose-500/5 -translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                    <span className="relative z-10 flex items-center justify-center gap-3 text-lg">
                      <XCircle size={24} />
                      Reject Report
                    </span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ReportsList({ complaints, role, onSelect, profile }: { complaints: Complaint[], role: string, onSelect: (c: Complaint) => void, profile: UserProfile | null }) {
  const [filter, setFilter] = useState<'all' | 'pending' | 'resolved'>('all');
  const [stationFilter, setStationFilter] = useState<'all' | 'mine'>('all');
  
  const filtered = complaints.filter(c => {
    // Status filter
    let statusMatch = true;
    if (filter === 'pending') statusMatch = c.status === 'pending' || c.status === 'under-review';
    else if (filter === 'resolved') statusMatch = c.status === 'resolved';

    // Station filter (only for admins)
    let stationMatch = true;
    if (role === 'admin' && stationFilter === 'mine' && profile?.nearestStationId) {
      stationMatch = c.assignedStationId === profile.nearestStationId;
    }

    return statusMatch && stationMatch;
  });

  return (
    <div className="space-y-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-8">
        <div>
          <h2 className="text-4xl font-black text-white tracking-tighter flex items-center gap-4">
            <div className="w-12 h-12 vibrant-gradient rounded-2xl flex items-center justify-center shadow-xl glow-indigo">
              <FileText size={24} className="text-white" />
            </div>
            Report Archive
          </h2>
          <p className="text-slate-400 font-bold mt-2 ml-16">Browse and track all filed reports</p>
        </div>
        
        <div className="flex flex-col gap-4 self-start">
          {role === 'admin' && profile?.nearestStationId && (
            <div className="flex p-2 bg-white/5 backdrop-blur-xl rounded-[2rem] border border-white/10 shadow-2xl">
              {(['all', 'mine'] as const).map(f => (
                <button 
                  key={f}
                  onClick={() => setStationFilter(f)}
                  className={cn(
                    "px-8 py-3 text-xs font-black rounded-[1.5rem] transition-all capitalize tracking-[0.2em]", 
                    stationFilter === f ? "bg-indigo-500 text-white shadow-xl glow-indigo" : "text-slate-500 hover:text-slate-300"
                  )}
                >
                  {f === 'mine' ? 'My Station' : 'All Stations'}
                </button>
              ))}
            </div>
          )}
          
          <div className="flex p-2 bg-white/5 backdrop-blur-xl rounded-[2rem] border border-white/10 shadow-2xl">
            {(['all', 'pending', 'resolved'] as const).map(f => (
              <button 
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "px-8 py-3 text-xs font-black rounded-[1.5rem] transition-all capitalize tracking-[0.2em]", 
                  filter === f ? "bg-white/10 text-indigo-400 shadow-xl border border-white/10" : "text-slate-500 hover:text-slate-300"
                )}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-10">
        {filtered.map(c => (
          <motion.div 
            key={c.id} 
            whileHover={{ y: -15, scale: 1.03, rotate: 1 }}
            onClick={() => onSelect(c)}
            className="glass-card p-10 rounded-[4rem] hover:shadow-3xl hover:shadow-indigo-500/20 transition-all group cursor-pointer border-none relative overflow-hidden premium-shadow"
          >
            <div className={cn(
              "absolute top-0 right-0 w-48 h-48 opacity-10 -mr-20 -mt-20 rounded-full blur-[80px] transition-all duration-700 group-hover:scale-150 group-hover:opacity-20",
              c.type === 'lost' ? "bg-rose-500" : "bg-emerald-500"
            )} />
            
            <div className="flex flex-col gap-8 relative z-10">
              <div className="flex items-start justify-between">
                <div className={cn(
                  "w-20 h-20 rounded-[2rem] flex items-center justify-center flex-shrink-0 shadow-2xl transition-all duration-500 group-hover:scale-110 group-hover:rotate-12",
                  c.type === 'lost' ? "bg-rose-500 text-white glow-rose" : "bg-emerald-500 text-white glow-emerald"
                )}>
                  {c.type === 'lost' ? <AlertCircle size={40} /> : <Search size={40} />}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={cn(
                    "px-6 py-2 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-2xl border border-white/10",
                    c.status === 'resolved' ? "bg-emerald-500/20 text-emerald-400" : 
                    c.status === 'rejected' ? "bg-rose-500/20 text-rose-400" : "bg-indigo-500/20 text-indigo-400"
                  )}>
                    {c.status}
                  </span>
                  <span className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] mr-2">#{c.id.slice(0, 6)}</span>
                </div>
              </div>
              
              <div>
                <h3 className="text-2xl font-black text-white mb-3 group-hover:text-indigo-400 transition-colors tracking-tighter">{c.category}</h3>
                <p className="text-slate-400 text-base line-clamp-3 leading-relaxed font-bold opacity-80 group-hover:opacity-100 transition-opacity italic">"{c.description}"</p>
                
                <div className="flex flex-wrap items-center gap-4 mt-8">
                  <span className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-2xl border border-white/5 shadow-sm text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                    <Clock size={16} className="text-indigo-400" /> 
                    {format(c.createdAt?.toDate?.() || new Date(), 'MMM d, yyyy')}
                  </span>
                  <span className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-2xl border border-white/5 shadow-sm text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                    <Building2 size={16} className="text-indigo-400" /> 
                    {c.assignedStationName}
                  </span>
                </div>
              </div>

              {c.adminMessage && (
                <div className="bg-indigo-500/10 backdrop-blur-xl p-6 rounded-[2.5rem] border border-indigo-500/20 mt-2 shadow-2xl relative overflow-hidden group/msg">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 blur-2xl -mr-12 -mt-12" />
                  <p className="text-[10px] font-black text-indigo-400 mb-3 uppercase tracking-[0.2em] flex items-center gap-2 relative z-10">
                    <ShieldCheck size={16} />
                    Official Directive
                  </p>
                  <p className="text-sm text-indigo-200 leading-relaxed font-bold italic relative z-10 group-hover/msg:text-white transition-colors">"{c.adminMessage}"</p>
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="glass-card py-20 text-center rounded-[2.5rem]">
          <div className="w-20 h-20 bg-slate-800/40 rounded-3xl flex items-center justify-center mx-auto mb-6 opacity-40">
            <Filter className="text-slate-500" size={40} />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">No reports found</h3>
          <p className="text-slate-400 max-w-xs mx-auto">There are no reports matching your current filter criteria.</p>
        </div>
      )}
    </div>
  );
}

function ProfileSection({ profile }: { profile: UserProfile | null }) {
  if (!profile) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-12">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-card p-16 rounded-[4rem] relative overflow-hidden text-center premium-shadow group"
      >
        <div className="absolute top-0 right-0 w-96 h-96 vibrant-gradient opacity-10 blur-[100px] -mr-48 -mt-48 transition-transform duration-1000 group-hover:scale-150" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-500 opacity-10 blur-[100px] -ml-48 -mb-48 transition-transform duration-1000 group-hover:scale-150" />
        
        <div className="relative">
          <motion.div 
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            className="w-36 h-36 vibrant-gradient rounded-[3rem] flex items-center justify-center mx-auto mb-10 shadow-2xl shadow-indigo-500/40 text-white text-5xl font-black glow-indigo shimmer relative"
          >
            {profile.name[0]}
            <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-emerald-500 rounded-full border-4 border-slate-950 flex items-center justify-center shadow-lg">
              <CheckCircle size={20} className="text-white" />
            </div>
          </motion.div>
          <h2 className="text-5xl font-black text-white tracking-tighter mb-4">{profile.name}</h2>
          <div className="inline-flex items-center gap-3 px-8 py-3 bg-indigo-500/10 text-indigo-400 rounded-full text-xs font-black uppercase tracking-[0.2em] shadow-sm border border-indigo-500/20 backdrop-blur-md">
            <ShieldCheck size={18} />
            {profile.role === 'admin' ? 'Police Administrator' : 'Verified Citizen'}
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="glass-card rounded-[3.5rem] overflow-hidden premium-shadow border-none">
          <div className="p-10 border-b border-white/5 bg-white/5 backdrop-blur-xl">
            <h3 className="text-2xl font-black text-white tracking-tighter flex items-center gap-4">
              <UserIcon className="text-indigo-400" size={28} />
              Personal Details
            </h3>
          </div>
          <div className="divide-y divide-white/5">
            <ProfileItem icon={Mail} label="Email Address" value={profile.email} />
            <ProfileItem icon={Phone} label="Phone Number" value={profile.phone || 'Not provided'} />
            <ProfileItem icon={MapPin} label="Residential Address" value={profile.address || 'Not provided'} />
          </div>
        </div>

        <div className="glass-card rounded-[3.5rem] overflow-hidden premium-shadow border-none">
          <div className="p-10 border-b border-white/5 bg-white/5 backdrop-blur-xl">
            <h3 className="text-2xl font-black text-white tracking-tighter flex items-center gap-4">
              <Building2 className="text-indigo-400" size={28} />
              Station Assignment
            </h3>
          </div>
          <div className="p-10 space-y-6">
            <div className="bg-white/5 p-8 rounded-[2.5rem] border border-white/5">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4">Assigned Authority</p>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-indigo-500/20 rounded-2xl flex items-center justify-center text-indigo-400">
                  <Building2 size={32} />
                </div>
                <div>
                  <p className="text-xl font-black text-white tracking-tight">{profile.stationName || profile.nearestStationId || 'Not set'}</p>
                  <p className="text-xs font-bold text-slate-500">Official Police Station</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="glass-card p-12 rounded-[4rem] flex flex-col sm:flex-row items-center justify-between gap-8 premium-shadow border-rose-500/10">
        <div className="text-center sm:text-left">
          <h3 className="text-white text-3xl font-black tracking-tighter mb-2">Security & Access</h3>
          <p className="text-slate-400 font-bold">Manage your account security and session.</p>
        </div>
        <div className="flex flex-wrap justify-center gap-4">
          <button className="px-10 py-5 bg-white/5 text-slate-300 font-black rounded-[1.5rem] border border-white/10 hover:bg-white/10 transition-all uppercase tracking-widest text-xs">
            Change Password
          </button>
          <button 
            onClick={() => auth.signOut()}
            className="px-10 py-5 bg-rose-600 text-white font-black rounded-[1.5rem] shadow-2xl shadow-rose-900/40 hover:bg-rose-700 transition-all uppercase tracking-widest text-xs shimmer"
          >
            Sign Out Securely
          </button>
        </div>
      </div>
    </div>
  );
}

function ProfileItem({ icon: Icon, label, value }: { icon: any, label: string, value: string }) {
  return (
    <div className="p-6 flex items-center gap-4">
      <div className="w-10 h-10 bg-slate-800/40 rounded-xl flex items-center justify-center text-slate-500">
        <Icon size={20} />
      </div>
      <div>
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">{label}</p>
        <p className="text-white font-medium">{value}</p>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }: { label: string, value: number, icon: any, color: 'blue' | 'emerald' | 'slate' | 'orange' }) {
  const colors = {
    blue: "bg-indigo-500 text-white shadow-indigo-900/20 glow-indigo",
    emerald: "bg-emerald-500 text-white shadow-emerald-900/20 glow-emerald",
    slate: "bg-slate-800 text-white shadow-slate-900/20",
    orange: "bg-orange-500 text-white shadow-orange-900/20 glow-amber"
  };

  return (
    <motion.div 
      whileHover={{ y: -5, scale: 1.02 }}
      className="glass-card p-6 rounded-[2rem] border-none premium-shadow"
    >
      <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mb-4 shadow-xl transition-transform hover:rotate-12", colors[color])}>
        <Icon size={24} />
      </div>
      <p className="text-4xl font-black text-white tracking-tighter">{value}</p>
      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">{label}</p>
    </motion.div>
  );
}

function ComplaintItem({ complaint, onClick }: { complaint: Complaint, onClick?: () => void }) {
  return (
    <motion.div 
      whileHover={{ x: 5, scale: 1.01 }}
      onClick={onClick}
      className="bg-slate-900/40 backdrop-blur-md p-5 rounded-[2rem] border border-white/5 shadow-sm flex items-center gap-5 hover:shadow-xl hover:shadow-indigo-500/5 transition-all cursor-pointer group premium-shadow"
    >
      <div className={cn(
        "w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-xl transition-transform group-hover:scale-110 group-hover:rotate-3",
        complaint.type === 'lost' ? "bg-rose-500 text-white glow-rose" : "bg-emerald-500 text-white glow-emerald"
      )}>
        {complaint.type === 'lost' ? <AlertCircle size={28} /> : <Search size={28} />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <h4 className="text-lg font-black text-white truncate tracking-tight">{complaint.category}</h4>
          <span className="text-xs text-slate-500 font-bold uppercase tracking-widest">{format(complaint.createdAt?.toDate?.() || new Date(), 'MMM d')}</span>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-slate-400 text-sm truncate pr-4 font-medium">{complaint.description}</p>
          <StatusBadge status={complaint.status} />
        </div>
      </div>
      <div className="w-10 h-10 rounded-full bg-slate-800/40 flex items-center justify-center text-slate-600 group-hover:bg-indigo-500/10 group-hover:text-indigo-400 transition-all">
        <ChevronRight size={20} />
      </div>
    </motion.div>
  );
}
