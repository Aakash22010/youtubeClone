import mongoose, { Schema, Document } from 'mongoose';

export interface IComment extends Document {
  content: string;
  userId: mongoose.Types.ObjectId;
  videoId: mongoose.Types.ObjectId;
  parentComment: mongoose.Types.ObjectId | null;
  likes: mongoose.Types.ObjectId[];
  dislikes: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const commentSchema = new Schema<IComment>({
  content: { type: String, required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  videoId: { type: Schema.Types.ObjectId, ref: 'Video', required: true },
  parentComment: { type: Schema.Types.ObjectId, ref: 'Comment', default: null },
  likes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  dislikes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: true });

export default mongoose.model<IComment>('Comment', commentSchema);