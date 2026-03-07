export interface User {
  _id: string;
  firebaseUid: string;
  email: string;
  displayName: string;
  photoURL: string;
  banner?: string;
  description?: string;
  subscribers: string[];
  subscribedTo: string[];
  // ── Premium ────────────────────────────────────────────────────────────────
  isPremium: boolean;
  premiumSince?: string | null;
  razorpayPaymentId?: string | null;
  // ── Downloads ──────────────────────────────────────────────────────────────
  downloads: DownloadEntry[];
  lastDownloadDate?: string | null;
  dailyDownloadCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Video {
  _id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  videoUrl: string;
  duration: number;
  views: number;
  likes: string[];
  dislikes: string[];
  userId: User | string;
  category: string;
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  _id: string;
  content: string;
  userId: User;
  videoId: string;
  parentComment: string | null;
  likes: string[];
  dislikes: string[];
  city: string;
  createdAt: string;
  updatedAt: string;
  replies?: Comment[];
}

export interface Playlist {
  _id: string;
  name: string;
  description?: string;
  userId: string | User;
  videos: Video[];
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

// ── Download ──────────────────────────────────────────────────────────────────

export interface DownloadEntry {
  videoId: Video;          // populated by backend
  downloadedAt: string;
}

export interface DlMeta {
  isPremium: boolean;
  dailyDownloadCount: number;
  dailyLimit: number;
}

// ── Profile ───────────────────────────────────────────────────────────────────

export interface UserProfile {
  _id: string;
  displayName: string;
  photoURL: string;
  banner: string;
  description: string;
  isPremium: boolean;
  subscribers: Pick<User, '_id' | 'displayName' | 'photoURL'>[];
}

// ── Payment ───────────────────────────────────────────────────────────────────

export interface RazorpayOrderResponse {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
}

export interface RazorpayVerifyPayload {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}