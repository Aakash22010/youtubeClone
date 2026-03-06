import mongoose, { Schema, Document } from 'mongoose';

export interface IWatchHistory extends Document {
  userId: mongoose.Types.ObjectId;
  videoId: mongoose.Types.ObjectId;
  watchedAt: Date;
}

const watchHistorySchema = new Schema<IWatchHistory>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  videoId: { type: Schema.Types.ObjectId, ref: 'Video', required: true },
  watchedAt: { type: Date, default: Date.now },
});

// Index for quick user history lookup
watchHistorySchema.index({ userId: 1, watchedAt: -1 });

export default mongoose.model<IWatchHistory>('WatchHistory', watchHistorySchema);