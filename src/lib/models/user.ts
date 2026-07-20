import mongoose, { Schema, Document } from 'mongoose';

export interface IUserDoc extends Document {
  email: string;
  password: string;
  name: string;
  role: 'ADMIN' | 'CONDUCTOR';
  isActive: boolean;
  spreadsheetId?: string;
  spreadsheetUrl?: string;
  sheetTab?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUserDoc>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    password: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    role: {
      type: String,
      enum: ['ADMIN', 'CONDUCTOR'],
      default: 'CONDUCTOR',
    },
    isActive: {
      type: Boolean,
      default: false,
    },
    spreadsheetId: {
      type: String,
    },
    spreadsheetUrl: {
      type: String,
    },
    sheetTab: {
      type: String,
    },
  },
  { timestamps: true }
);

export const User = mongoose.models.User || mongoose.model<IUserDoc>('User', UserSchema);
