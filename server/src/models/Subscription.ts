import mongoose, { Schema, Document } from 'mongoose';

export interface ISubscription extends Document {
  subscriber: mongoose.Types.ObjectId;
  channel: mongoose.Types.ObjectId;
  createdAt: Date;
}

const subscriptionSchema = new Schema<ISubscription>({
  subscriber: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  channel: { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

subscriptionSchema.index({ subscriber: 1, channel: 1 }, { unique: true });

export default mongoose.model<ISubscription>('Subscription', subscriptionSchema);