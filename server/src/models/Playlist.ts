import mongoose, { Schema, Document } from 'mongoose';

export interface IPlaylist extends Document {
  name: string;
  description?: string;
  userId: mongoose.Types.ObjectId;
  videos: mongoose.Types.ObjectId[];
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const playlistSchema = new Schema<IPlaylist>({
  name: { type: String, required: true },
  description: String,
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  videos: [{ type: Schema.Types.ObjectId, ref: 'Video' }],
  isPublic: { type: Boolean, default: false },
}, { timestamps: true });

export default mongoose.model<IPlaylist>('Playlist', playlistSchema);