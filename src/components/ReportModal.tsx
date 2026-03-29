import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  AlertCircle, 
  Search, 
  ShieldCheck, 
  Image as ImageIcon, 
  Upload, 
  Loader2 
} from 'lucide-react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';
import { CATEGORIES, POLICE_STATIONS } from '../constants';
import { MapPicker } from './MapPicker';
import { cn } from '../lib/utils';

interface ReportModalProps {
  isOpen: 'lost' | 'found' | null;
  onClose: () => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>, type: 'lost' | 'found', location: { lat: number, lng: number } | null, imageUrl: string | null) => Promise<void>;
}

export const ReportModal: React.FC<ReportModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [reportLocation, setReportLocation] = useState<{ lat: number, lng: number } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const storageRef = ref(storage, `complaints/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setUploadedImageUrl(url);
    } catch (error) {
      console.error("Image upload failed:", error);
    } finally {
      setIsUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="glass-card w-full max-w-xl rounded-[4rem] shadow-2xl overflow-hidden border-none premium-shadow relative"
      >
        <div className="absolute top-0 right-0 w-64 h-64 vibrant-gradient opacity-10 blur-[100px] -mr-32 -mt-32" />
        
        <div className="p-10 border-b border-white/5 flex items-center justify-between bg-white/5 backdrop-blur-2xl relative z-10">
          <div>
            <h3 className="text-3xl font-black text-white tracking-tighter flex items-center gap-3">
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center shadow-lg glow-indigo shimmer",
                isOpen === 'lost' ? "bg-rose-500" : "bg-emerald-500"
              )}>
                {isOpen === 'lost' ? <AlertCircle size={20} className="text-white" /> : <Search size={20} className="text-white" />}
              </div>
              Report {isOpen === 'lost' ? 'Lost' : 'Found'} Item
            </h3>
            <p className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] mt-2">Official State Registry Filing</p>
          </div>
          <button onClick={onClose} className="w-12 h-12 flex items-center justify-center hover:bg-white/10 rounded-2xl transition-all text-slate-500 hover:text-white border border-white/5 shadow-xl"><X size={28} /></button>
        </div>

        <form onSubmit={async (e) => {
          e.preventDefault();
          await onSubmit(e, isOpen, reportLocation, uploadedImageUrl);
          onClose();
          setReportLocation(null);
          setUploadedImageUrl(null);
        }} className="p-10 space-y-8 max-h-[75vh] overflow-y-auto custom-scrollbar relative z-10">
          <div className="space-y-4">
            <label className="block text-xs font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Item Category</label>
            <select name="category" className="w-full px-8 py-5 bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2rem] focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500/40 outline-none text-white font-bold text-lg shadow-inner cursor-pointer appearance-none transition-all">
              {CATEGORIES.map(c => <option key={c} value={c} className="bg-slate-900">{c}</option>)}
            </select>
          </div>

          <div className="space-y-4">
            <label className="block text-xs font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Detailed Description</label>
            <textarea name="description" required rows={4} className="w-full px-8 py-6 bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500/40 outline-none text-white font-bold text-lg shadow-inner placeholder:text-slate-600 transition-all" placeholder="Provide details like color, brand, unique marks..."></textarea>
          </div>

          <div className="space-y-4">
            <label className="block text-xs font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Assigned Police Station</label>
            <select name="stationId" className="w-full px-8 py-5 bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2rem] focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500/40 outline-none text-white font-bold text-lg shadow-inner cursor-pointer appearance-none transition-all">
              {POLICE_STATIONS.map(s => <option key={s.id} value={s.id} className="bg-slate-900">{s.name}</option>)}
            </select>
          </div>

          <div className="space-y-4">
            <label className="block text-xs font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Item Image (Optional)</label>
            <div className="relative group">
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleImageUpload}
                className="hidden" 
                id="image-upload"
              />
              <label 
                htmlFor="image-upload"
                className="flex flex-col items-center justify-center w-full h-48 bg-white/5 backdrop-blur-xl border-2 border-dashed border-white/10 rounded-[2.5rem] cursor-pointer hover:bg-white/10 transition-all group-hover:border-indigo-500/40"
              >
                {isUploading ? (
                  <Loader2 className="w-12 h-12 text-indigo-400 animate-spin" />
                ) : uploadedImageUrl ? (
                  <div className="relative w-full h-full p-4">
                    <img src={uploadedImageUrl} alt="Uploaded" className="w-full h-full object-cover rounded-2xl" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-2xl">
                      <Upload className="text-white w-8 h-8" />
                    </div>
                  </div>
                ) : (
                  <>
                    <ImageIcon className="w-12 h-12 text-slate-600 mb-4 group-hover:text-indigo-400 transition-colors" />
                    <p className="text-sm font-black text-slate-500 uppercase tracking-[0.2em] group-hover:text-slate-300">Click to upload photo</p>
                  </>
                )}
              </label>
            </div>
          </div>

          <div className="space-y-4">
            <label className="block text-xs font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Incident Location</label>
            <div className="rounded-[2.5rem] overflow-hidden border border-white/10 shadow-2xl relative group">
              <MapPicker onLocationSelect={(lat, lng) => setReportLocation({ lat, lng })} />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={isUploading}
            className="group relative w-full py-6 bg-indigo-600 text-white font-black rounded-[2rem] shadow-2xl shadow-indigo-500/30 hover:bg-indigo-700 transition-all glow-indigo overflow-hidden disabled:opacity-50"
          >
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
            <span className="relative z-10 flex items-center justify-center gap-3 text-xl">
              <ShieldCheck size={28} />
              Submit Official Report
            </span>
          </button>
        </form>
      </motion.div>
    </div>
  );
};
