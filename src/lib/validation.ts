import { z } from 'zod';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Identificador inválido');
const shortText = (max: number) => z.string().trim().min(1).max(max);

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Correo inválido').max(254),
  password: z.string().min(1, 'La contraseña es requerida').max(200),
});

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const tripQuerySchema = paginationSchema.extend({
  brand: shortText(100).optional(),
  userId: objectId.optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  flagged: z.enum(['true', 'false']).optional(),
});

export const tripCreateSchema = z.object({
  origin: shortText(300),
  destination: shortText(300),
  brand: shortText(100),
  tipoServicio: z.enum(['Entrega', 'Recogida']),
  quienSolicita: z.string().trim().max(200).optional().default(''),
  numeroOP: z.string().trim().max(100).optional().default(''),
  userId: objectId.optional(),
});

export const tripUpdateSchema = z.object({
  origin: shortText(300).optional(),
  destination: shortText(300).optional(),
  brand: shortText(100).optional(),
  tipoServicio: z.enum(['Entrega', 'Recogida']).optional(),
  distanceKm: z.coerce.number().min(0).max(100_000).optional(),
  travelTimeMin: z.coerce.number().min(0).max(100_000).optional(),
  status: z.enum(['completed', 'flagged', 'reviewed']).optional(),
  flagged: z.boolean().optional(),
});

export const userQuerySchema = paginationSchema.extend({
  isActive: z.enum(['true', 'false']).optional(),
  role: z.enum(['ADMIN', 'CONDUCTOR']).optional(),
});

export const userCreateSchema = z.object({
  name: shortText(120),
  email: z.string().trim().toLowerCase().email('Correo inválido').max(254),
  password: z
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .max(200),
});

export const userUpdateSchema = z.object({
  name: shortText(120).optional(),
  email: z.string().trim().toLowerCase().email('Correo inválido').max(254).optional(),
  isActive: z.boolean().optional(),
  spreadsheetId: z.string().trim().min(10).max(200).optional(),
  spreadsheetUrl: z.string().trim().url('URL inválida').max(500).optional(),
});

export const statsQuerySchema = z.object({
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  brand: shortText(100).optional(),
  userId: objectId.optional(),
});

export const sheetLinkSchema = z.object({
  userId: objectId,
  spreadsheetId: z.string().trim().min(10).max(200),
  spreadsheetUrl: z.string().trim().url('URL inválida').max(500).optional(),
});

export function formatZodError(error: z.ZodError): string {
  return error.issues
    .map((issue) => {
      const path = issue.path.join('.');
      return path ? `${path}: ${issue.message}` : issue.message;
    })
    .join('; ');
}

export function objectFromSearchParams(searchParams: URLSearchParams) {
  return Object.fromEntries(searchParams.entries());
}
