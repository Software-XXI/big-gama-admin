import { connectDB } from "./mongodb";
import { appendTripRow } from "./google-sheets";
import { User } from "./models/user";
import { Trip } from "./models/trip";

export interface QueuedSheetWrite {
  tripId: string;
  userId: string;
  row: (string | number)[];
  retries: number;
}

const MAX_RETRIES = 3;

export async function writeToSheet(
  tripId: string,
  userId: string,
  row: (string | number)[],
): Promise<boolean> {
  let attempts = 0;

  while (attempts < MAX_RETRIES) {
    try {
      await connectDB();
      const user = await User.findById(userId).select("spreadsheetId sheetTab");
      if (!user?.spreadsheetId) {
        console.error(`writeToSheet: user ${userId} has no spreadsheetId linked`);
        return false;
      }

      const rowNumber = await appendTripRow(user.spreadsheetId, user.sheetTab || "Viajes", row);
      if (rowNumber) {
        await Trip.findByIdAndUpdate(tripId, { spreadsheetRow: rowNumber });
        return true;
      }

      attempts++;
      if (attempts < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, 1000 * attempts));
      }
    } catch (err) {
      console.error(`writeToSheet: attempt ${attempts + 1}/${MAX_RETRIES} failed for trip ${tripId}:`, {
        error: err instanceof Error ? err.message : err,
        stack: err instanceof Error ? err.stack : undefined,
      });
      attempts++;
      if (attempts < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, 1000 * attempts));
      }
    }
  }

  console.error(`writeToSheet: all ${MAX_RETRIES} attempts failed for trip ${tripId}`);
  return false;
}
