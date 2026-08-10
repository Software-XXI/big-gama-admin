import { connectDB } from "./mongodb";
import { appendTripRow, getDefaultSheet, ensureDriverTab } from "./google-sheets";
import { User } from "./models/user";
import { Trip } from "./models/trip";

export interface QueuedSheetWrite {
  tripId: string;
  userId: string;
  row: (string | number)[];
  retries: number;
}

const MAX_RETRIES = 3;

interface SheetTarget {
  spreadsheetId: string;
  sheetTab: string;
}

export async function getDriverSheetTarget(user: {
  _id: unknown;
  name?: string;
  spreadsheetId?: string;
  spreadsheetUrl?: string;
  sheetTab?: string;
}): Promise<SheetTarget | null> {
  let spreadsheetId = user.spreadsheetId;
  let spreadsheetUrl = user.spreadsheetUrl;
  let sheetTab = user.sheetTab;

  if (!spreadsheetId) {
    const defaultSheet = getDefaultSheet();
    if (!defaultSheet) return null;
    spreadsheetId = defaultSheet.spreadsheetId;
    spreadsheetUrl = defaultSheet.spreadsheetUrl;
  }

  if (!sheetTab) {
    const tabName = await ensureDriverTab(spreadsheetId, user.name || "Conductor");
    if (!tabName) return null;
    sheetTab = tabName;
    await User.findByIdAndUpdate(user._id, {
      spreadsheetId,
      spreadsheetUrl,
      sheetTab,
    });
  }

  return { spreadsheetId, sheetTab };
}

export async function writeToSheet(
  tripId: string,
  userId: string,
  row: (string | number)[],
): Promise<boolean> {
  let attempts = 0;

  while (attempts < MAX_RETRIES) {
    try {
      await connectDB();
      const user = await User.findById(userId).select("spreadsheetId spreadsheetUrl sheetTab name");

      const target = await getDriverSheetTarget(
        user?.toObject() || { _id: userId }
      );
      if (!target) {
        console.error(`writeToSheet: user ${userId} has no spreadsheetId linked and no default sheet available`);
        return false;
      }

      const rowNumber = await appendTripRow(target.spreadsheetId, target.sheetTab, row);
      if (rowNumber) {
        await Trip.findByIdAndUpdate(tripId, {
          spreadsheetRow: rowNumber,
          spreadsheetTab: target.sheetTab,
        });
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