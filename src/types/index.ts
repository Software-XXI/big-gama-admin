export interface IUser {
  _id?: string;
  email: string;
  password: string;
  name: string;
  role: 'ADMIN' | 'CONDUCTOR';
  isActive: boolean;
  spreadsheetId?: string;
  spreadsheetUrl?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ITrip {
  _id?: string;
  origin: string;
  destination: string;
  brand: string;
  distanceKm: number;
  travelTimeMin: number;
  userId: string;
  driverName: string;
  status: 'completed' | 'flagged' | 'reviewed';
  flagged: boolean;
  flagReason?: string;
  spreadsheetRow?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export type UserRole = 'ADMIN' | 'CONDUCTOR';

export interface AuthResponse {
  accessToken: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: UserRole;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
}

export interface TripStats {
  totalTrips: number;
  totalKm: number;
  totalTimeMin: number;
  byBrand: { brand: string; count: number; totalKm: number }[];
  byDriver: { driverName: string; userId: string; count: number; totalKm: number }[];
}
