import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { BatchError } from "@/types/batchError"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function parseBatchError(error: unknown): BatchError | null {
  if (typeof error === 'string') {
    try {
      // Find JSON in the string if it's mixed with other output
      // Look for a JSON object structure has "status", "message", and "commands"
      const jsonMatch = error.match(/\{[\s\S]*"status"[\s\S]*"message"[\s\S]*"commands"[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.status && parsed.message) {
          return parsed as BatchError;
        }
      }
      
      // try parsing the whole string if it's just JSON
      const parsed = JSON.parse(error);
      if (parsed.status && parsed.message) {
        return parsed as BatchError;
      }
    } catch (e) {
      // Not valid JSON or doesn't match schema
    }
  } else if (typeof error === 'object' && error !== null) {
    const e = error as any;
    if (e.status && e.message) {
      return e as BatchError;
    }
  }
  return null;
}

export function parseWindowsTimestamp(ts: string | undefined): Date | null {
  if (!ts) return null;
  // Format: MM/DD/YYYY HH:MM
  try {
    const [datePart, timePart] = ts.split(" ");
    if (!datePart || !timePart) return null;
    
    const [month, day, year] = datePart.split("/");
    if (!month || !day || !year) return null;
    
    // Construct ISO string: YYYY-MM-DDTHH:MM:00
    const isoString = `${year}-${month}-${day}T${timePart}:00`;
    const date = new Date(isoString);
    
    return isNaN(date.getTime()) ? null : date;
  } catch (e) {
    return null;
  }
}
