import mongoose, { Schema, Document } from 'mongoose';

export interface IDownloadEntry {
  videoId: mongoose.Types.ObjectId;
  downloadedAt: Date;
}

export interface IUser extends Document {
  firebaseUid: string;
  email: string;
  displayName: string;
  photoURL: string;
  banner: string;
  description: string;
  subscribers: mongoose.Types.ObjectId[];
  subscribedTo: mongoose.Types.ObjectId[];
  // ── Premium ──────────────────────────────────────────────────────────────
  isPremium: boolean;
  premiumSince: Date | null;
  razorpayPaymentId: string | null;
  // ── Downloads ────────────────────────────────────────────────────────────
  downloads: IDownloadEntry[];
  lastDownloadDate: Date | null;
  dailyDownloadCount: number;
  // ── Plan (watch time tiers) ───────────────────────────────────────────────
  plan: 'free' | 'bronze' | 'silver' | 'gold';
  planExpiresAt: Date | null;
  planPaymentId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const downloadEntrySchema = new Schema<IDownloadEntry>(
  {
    videoId:      { type: Schema.Types.ObjectId, ref: 'Video', required: true },
    downloadedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const userSchema = new Schema<IUser>(
  {
    firebaseUid:        { type: String,  required: true, unique: true },
    email:              { type: String,  required: true },
    displayName:        String,
    photoURL:           String,
    banner:             String,
    description:        String,
    subscribers:        [{ type: Schema.Types.ObjectId, ref: 'User' }],
    subscribedTo:       [{ type: Schema.Types.ObjectId, ref: 'User' }],

    // Premium
    isPremium:          { type: Boolean, default: false },
    premiumSince:       { type: Date,    default: null },
    razorpayPaymentId:  { type: String,  default: null },

    // Downloads
    downloads:          { type: [downloadEntrySchema], default: [] },
    lastDownloadDate:   { type: Date,    default: null },
    dailyDownloadCount: { type: Number,  default: 0 },

    // ── Plan ─────────────────────────────────────────────────────────────
    plan: {
      type:    String,
      enum:    ['free', 'bronze', 'silver', 'gold'],
      default: 'free',
    },
    planExpiresAt:  { type: Date,   default: null },
    planPaymentId:  { type: String, default: null },
  },
  { timestamps: true }
);

export default mongoose.model<IUser>('User', userSchema);