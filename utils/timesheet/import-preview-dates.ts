import { parseDmyToIsoStrict } from "@/utils/time/calendar-date";

/** Convert DD/MM/YYYY (single- or double-digit segments) to strict ISO YYYY-MM-DD for DB storage. */
export function dmySlashToIsoWire(val: string): string {
    const m = val.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!m) return "";
    const [, day, month, year] = m;
    const strict = `${day!.padStart(2, "0")}/${month!.padStart(2, "0")}/${year}`;
    return parseDmyToIsoStrict(strict) ?? "";
}

export function isValidDmySlashForPreview(val: string): boolean {
    return dmySlashToIsoWire(val) !== "";
}
