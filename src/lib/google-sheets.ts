import { google } from "googleapis";
import { calculateTripPrice } from "./pricing";

interface SheetAuth {
  clientEmail: string;
  privateKey: string;
}

function getAuthConfig(): SheetAuth | null {
  const clientEmail = process.env.GOOGLE_SHEETS_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_SHEETS_PRIVATE_KEY;

  if (!clientEmail || !privateKey) {
    console.error("Google Sheets auth config missing:", {
      hasClientEmail: !!clientEmail,
      hasPrivateKey: !!privateKey,
    });
    return null;
  }
  return { clientEmail, privateKey };
}

async function getSheetsClient() {
  const config = getAuthConfig();
  if (!config) return null;

  const auth = new google.auth.JWT({
    email: config.clientEmail,
    key: config.privateKey.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  return google.sheets({ version: "v4", auth });
}

export async function appendTripRow(
  spreadsheetId: string,
  sheetTab: string,
  row: (string | number)[],
): Promise<number | null> {
  const sheets = await getSheetsClient();
  if (!sheets) {
    console.error("appendTripRow: no sheets client available");
    return null;
  }

  try {
    const existing = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `'${sheetTab}'!A:A`,
    });

    const rowCount = existing.data.values?.length ?? 0;
    const targetRow = rowCount + 1;

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `'${sheetTab}'!A${targetRow}:K${targetRow}`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [row] },
    });

    return targetRow;
  } catch (err) {
    console.error("appendTripRow: Google Sheets API error:", {
      spreadsheetId,
      error: err instanceof Error ? err.message : err,
      stack: err instanceof Error ? err.stack : undefined,
    });
    return null;
  }
}

const HEADERS = [
  "Fecha", "Origen", "Destino", "Marca", "Kilómetros",
  "Tiempo (min)", "Estado", "Quien Solicita", "Número OP", "Tipo de servicio",
  "Total (COP)",
];

const FORMULA_PREFIX = /^[=+\-@\t\r]/;

function escapeSheetCell(value: string): string {
  return FORMULA_PREFIX.test(value) ? `'${value}` : value;
}

export function buildSheetRow(trip: {
  createdAt: Date;
  origin: string;
  destination: string;
  brand: string;
  distanceKm: number;
  travelTimeMin: number;
  flagged: boolean;
  quienSolicita?: string;
  numeroOP?: string;
  tipoServicio: string;
}): (string | number)[] {
  return [
    trip.createdAt.toISOString().split('T')[0],
    escapeSheetCell(trip.origin),
    escapeSheetCell(trip.destination),
    escapeSheetCell(trip.brand),
    trip.distanceKm,
    trip.travelTimeMin,
    trip.flagged ? 'ALERTA' : 'OK',
    escapeSheetCell(trip.quienSolicita || ''),
    escapeSheetCell(trip.numeroOP || ''),
    escapeSheetCell(trip.tipoServicio),
    calculateTripPrice(trip.distanceKm, trip.travelTimeMin),
  ];
}

export async function updateTripRow(
  spreadsheetId: string,
  sheetTab: string,
  rowNumber: number,
  row: (string | number)[],
): Promise<boolean> {
  const sheets = await getSheetsClient();
  if (!sheets) return false;
  try {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `'${sheetTab}'!A${rowNumber}:K${rowNumber}`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [row] },
    });
    return true;
  } catch (err) {
    console.error("updateTripRow: Google Sheets API error:", {
      spreadsheetId,
      rowNumber,
      error: err instanceof Error ? err.message : err,
    });
    return false;
  }
}

export async function deleteSpreadsheetRow(
  spreadsheetId: string,
  sheetTab: string,
  rowNumber: number,
): Promise<boolean> {
  const sheets = await getSheetsClient();
  if (!sheets) return false;
  try {
    const metadata = await sheets.spreadsheets.get({
      spreadsheetId,
      fields: "sheets.properties",
    });
    const sheet = metadata.data.sheets?.find(
      (s) => s.properties?.title?.toLowerCase() === sheetTab.toLowerCase()
    );
    if (!sheet?.properties?.sheetId) return false;

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId: sheet.properties.sheetId,
                dimension: "ROWS",
                startIndex: rowNumber - 1,
                endIndex: rowNumber,
              },
            },
          },
        ],
      },
    });
    return true;
  } catch (err) {
    console.error("deleteSpreadsheetRow: Google Sheets API error:", {
      spreadsheetId,
      rowNumber,
      error: err instanceof Error ? err.message : err,
    });
    return false;
  }
}

function sanitizeTabName(name: string): string {
  const cleaned = name
    .replace(/[\[\]:*?/\\']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 100)
    .trim();
  return cleaned || 'Conductor';
}

export async function ensureDriverTab(spreadsheetId: string, driverName: string): Promise<string | null> {
  const sheets = await getSheetsClient();
  if (!sheets) return null;

  const tabName = sanitizeTabName(driverName);

  try {
    const metadata = await sheets.spreadsheets.get({ spreadsheetId, fields: 'sheets.properties' });
    const existing = metadata.data.sheets?.find(
      (s) => s.properties?.title?.toLowerCase() === tabName.toLowerCase()
    );
    if (existing) return existing.properties!.title!;
  } catch {
    return null;
  }

  try {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [{ addSheet: { properties: { title: tabName } } }],
      },
    });
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `'${tabName}'!A1:K1`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [HEADERS] },
    });
    return tabName;
  } catch (err) {
    console.error("ensureDriverTab: failed to create tab", err instanceof Error ? err.message : err);
    return null;
  }
}

export async function initSheetHeaders(spreadsheetId: string): Promise<boolean> {
  const sheets = await getSheetsClient();
  if (!sheets) return false;
  try {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: "A1:K1",
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [HEADERS] },
    });
    return true;
  } catch (err) {
    console.error("initSheetHeaders failed:", err instanceof Error ? err.message : err);
    return false;
  }
}

export async function verifySheetAccess(spreadsheetId: string): Promise<boolean> {
  const sheets = await getSheetsClient();
  if (!sheets) return false;
  try {
    await sheets.spreadsheets.get({ spreadsheetId });
    return true;
  } catch {
    return false;
  }
}

export function getDefaultSheet() {
  const id = process.env.GOOGLE_SHEETS_DEFAULT_ID;
  if (!id) return null;
  return {
    spreadsheetId: id,
    spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${id}`,
  };
}
