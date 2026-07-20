import mongoose, { Schema, Document } from 'mongoose';

export interface IRouteCacheDoc extends Document {
  originNorm: string;
  destinationNorm: string;
  dayType: 'weekday' | 'weekend';
  hourBucket: number;
  distanceKm: number;
  travelTimeMin: number;
  originAddress: string;
  destinationAddress: string;
  hits: number;
  createdAt: Date;
  updatedAt: Date;
}

const RouteCacheSchema = new Schema<IRouteCacheDoc>(
  {
    originNorm: { type: String, required: true },
    destinationNorm: { type: String, required: true },
    dayType: {
      type: String,
      enum: ['weekday', 'weekend'],
      required: true,
    },
    hourBucket: { type: Number, required: true },
    distanceKm: { type: Number, required: true },
    travelTimeMin: { type: Number, required: true },
    originAddress: { type: String },
    destinationAddress: { type: String },
    hits: { type: Number, default: 1 },
  },
  { timestamps: true }
);

RouteCacheSchema.index(
  { originNorm: 1, destinationNorm: 1, dayType: 1, hourBucket: 1 },
  { unique: true }
);

RouteCacheSchema.index({ originNorm: 1, destinationNorm: 1 });

export const RouteCache =
  mongoose.models.RouteCache ||
  mongoose.model<IRouteCacheDoc>('RouteCache', RouteCacheSchema);
