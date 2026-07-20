import mongoose, { Schema, Document } from 'mongoose';

export interface ITripDoc extends Document {
  origin: string;
  destination: string;
  brand: string;
  distanceKm: number;
  travelTimeMin: number;
  userId: mongoose.Types.ObjectId;
  driverName: string;
  status: 'completed' | 'flagged' | 'reviewed';
  flagged: boolean;
  flagReason?: string;
  tipoServicio: 'Entrega' | 'Recogida';
  quienSolicita: string;
  numeroOP: string;
  spreadsheetRow?: number;
  createdAt: Date;
  updatedAt: Date;
}

const TripSchema = new Schema<ITripDoc>(
  {
    origin: {
      type: String,
      required: true,
      trim: true,
    },
    destination: {
      type: String,
      required: true,
      trim: true,
    },
    brand: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    distanceKm: {
      type: Number,
      required: true,
    },
    travelTimeMin: {
      type: Number,
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    driverName: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['completed', 'flagged', 'reviewed'],
      default: 'completed',
    },
    flagged: {
      type: Boolean,
      default: false,
      index: true,
    },
    flagReason: {
      type: String,
    },
    tipoServicio: {
      type: String,
      enum: ['Entrega', 'Recogida'],
      required: true,
    },
    quienSolicita: {
      type: String,
      default: '',
      trim: true,
    },
    numeroOP: {
      type: String,
      default: '',
      trim: true,
    },
    spreadsheetRow: {
      type: Number,
    },
  },
  { timestamps: true }
);

TripSchema.index({ userId: 1, createdAt: -1 });
TripSchema.index({ brand: 1, createdAt: -1 });
TripSchema.index({ createdAt: -1 });

export const Trip = mongoose.models.Trip || mongoose.model<ITripDoc>('Trip', TripSchema);
