import mongoose, { Schema, Document } from 'mongoose';

export interface IAnonymousView extends Document {
  videoId: mongoose.Types.ObjectId;
  anonymousId: string;
  createdAt: Date;
}

const anonymousViewSchema = new Schema<IAnonymousView>({
  videoId: { type: Schema.Types.ObjectId, ref: 'Video', required: true },
  anonymousId: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, expires: 86400 }, // auto‑delete after 24h
});

// Ensure one anonymous ID can view a video only once per 24h
anonymousViewSchema.index({ videoId: 1, anonymousId: 1 }, { unique: true });

export default mongoose.model<IAnonymousView>('AnonymousView', anonymousViewSchema);