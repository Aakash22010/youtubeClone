import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  firebaseUid: string;
  email: string;
  displayName: string;
  photoURL: string;
  banner: string;
  description: string;
  subscribers: mongoose.Types.ObjectId[];
  subscribedTo: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>({
  firebaseUid: { type: String, required: true, unique: true },
  email: { type: String, required: true },
  displayName: String,
  photoURL: String,
  banner: String,
  description: String,
  subscribers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  subscribedTo: [{ type: Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: true });

export default mongoose.model<IUser>('User', userSchema);