// ─── Plans ────────────────────────────────────────────────────────────────────

export type Plan = 'free' | 'bronze' | 'silver' | 'gold';

export interface PlanConfig {
  name:         string;
  price:        number;   // INR
  watchMinutes: number;   // Infinity for gold
  color:        string;   // tailwind text color class
  badge:        string;   // emoji
}

export const PLAN_CONFIGS: Record<Plan, PlanConfig> = {
  free:   { name: 'Free',   price: 0,   watchMinutes: 5,        color: 'text-gray-500',   badge: '' },
  bronze: { name: 'Bronze', price: 10,  watchMinutes: 7,        color: 'text-amber-600',  badge: '🥉' },
  silver: { name: 'Silver', price: 50,  watchMinutes: 10,       color: 'text-slate-400',  badge: '🥈' },
  gold:   { name: 'Gold',   price: 100, watchMinutes: Infinity, color: 'text-yellow-500', badge: '🥇' },
};

// ── CUMULATIVE watch limit in seconds per plan ─────────────────────────────────
// This is the TOTAL across ALL videos ever watched — NOT per-video.
// Once the user's totalWatchSeconds reaches this threshold, playback is paused.
export const CUMULATIVE_PLAN_LIMITS: Record<Plan, number> = {
  free:   5  * 60,    // 300 s
  bronze: 7  * 60,    // 420 s
  silver: 10 * 60,    // 600 s
  gold:   Infinity,   // unlimited
};

// ─── User ─────────────────────────────────────────────────────────────────────

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
  // ── Premium (download feature) ─────────────────────────────────────────────
  isPremium: boolean;
  premiumSince?: string | null;
  razorpayPaymentId?: string | null;
  // ── Downloads ──────────────────────────────────────────────────────────────
  downloads: DownloadEntry[];
  lastDownloadDate?: string | null;
  dailyDownloadCount: number;
  // ── Plan (watch time feature) ──────────────────────────────────────────────
  plan: Plan;
  planExpiresAt: string | null;
  planPaymentId: string | null;
  totalWatchSeconds: number;   // cumulative across ALL videos
  createdAt: string;
  updatedAt: string;
}

// ─── Video ────────────────────────────────────────────────────────────────────

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

// ─── Comment ──────────────────────────────────────────────────────────────────

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

// ─── Playlist ─────────────────────────────────────────────────────────────────

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

// ─── Download ─────────────────────────────────────────────────────────────────

export interface DownloadEntry {
  videoId: Video;
  downloadedAt: string;
}

export interface DlMeta {
  isPremium: boolean;
  dailyDownloadCount: number;
  dailyLimit: number;
}

// ─── Profile ──────────────────────────────────────────────────────────────────

export interface UserProfile {
  _id: string;
  displayName: string;
  photoURL: string;
  banner: string;
  description: string;
  isPremium: boolean;
  plan: Plan;
  planExpiresAt: string | null;
  subscribers: Pick<User, '_id' | 'displayName' | 'photoURL'>[];
}

// ─── Payment ──────────────────────────────────────────────────────────────────

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

// ─── Plan payment ─────────────────────────────────────────────────────────────

export interface PlanOrderResponse extends RazorpayOrderResponse {
  plan: Plan;
}

// ─── Watch time ───────────────────────────────────────────────────────────────

export interface WatchTimeResponse {
  totalWatchSeconds: number;
  limitReached:      boolean;
  plan:              Plan;
  planLimit:         number;   // Infinity serialised as -1 from backend
}