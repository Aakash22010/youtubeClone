import mongoose, { Document, Schema } from 'mongoose';

export interface ICategory extends Document {
  name: string;
  description?: string;
}

const CategorySchema = new Schema<ICategory>({
  name: { type: String, required: true, unique: true },
  description: String,
}, { timestamps: true });

export const Category = mongoose.model<ICategory>('Category', CategorySchema);