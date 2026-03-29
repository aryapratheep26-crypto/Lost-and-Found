
export type UserRole = 'user' | 'admin';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  nearestStationId?: string;
  stationName?: string;
  role: UserRole;
  createdAt: any;
}

export interface Complaint {
  id: string;
  userId: string;
  userName: string;
  type: 'lost' | 'found';
  category: string;
  description: string;
  imageUrl?: string;
  location?: { lat: number; lng: number; address?: string };
  status: 'pending' | 'under-review' | 'resolved' | 'rejected';
  assignedStationId: string;
  assignedStationName: string;
  adminMessage?: string;
  internalNotes?: string;
  createdAt: any;
  updatedAt?: any;
  resolvedAt?: any;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'status_change' | 'new_report';
  complaintId: string;
  read: boolean;
  createdAt: any;
}
