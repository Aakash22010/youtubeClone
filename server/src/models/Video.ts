import mongoose, { Schema, Document } from 'mongoose';
import { IUser } from './User';

export interface IVideo extends Document {
  title: string;
  description: string;
  thumbnailUrl: string;
  videoUrl: string;
  duration: number; // seconds
  views: number;
  viewedBy: mongoose.Types.ObjectId[];
  likes: mongoose.Types.ObjectId[];
  dislikes: mongoose.Types.ObjectId[];
  userId: mongoose.Types.ObjectId | IUser;
  category: string;
  createdAt: Date;
  updatedAt: Date;
}

const videoSchema = new Schema<IVideo>({
  title: { type: String, required: true },
  description: String,
  thumbnailUrl: String,
  videoUrl: { type: String, required: true },
  duration: Number,
  views: { type: Number, default: 0 },
  likes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  dislikes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  category: String,
  viewedBy: [{ type: Schema.Types.ObjectId, ref: 'User' }], // 👈 new field
}, { timestamps: true });

export default mongoose.model<IVideo>('Video', videoSchema);