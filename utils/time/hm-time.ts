export function isHmTimeStrict(value: string): boolean {
    return /^([01]\d|2[0-3]):([0-5]\d)$/.test(value.trim());
}

/** HH:MM or HH:MM:SS (Postgres `time` wire formats used by the app and imports). */
export function isTimesheetWireTimeStrict(value: string): boolean {
    const t = value.trim();
    if (isHmTimeStrict(t)) return true;
    return /^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/.test(t);
}

export function normalizeHmTime(value: string): string {
    const match = value.trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
    if (!match) return "";
    const hour = Number.parseInt(match[1], 10);
    const minute = Number.parseInt(match[2], 10);
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return "";
    return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

/** Local time display as HH:MM (null-safe; normalizes via {@link normalizeHmTime}). */
export function localTimeHm(t: string | null | undefined): string {
    const s = String(t ?? "").trim();
    if (!s) return "";
    return normalizeHmTime(s);
}

/**
 * Normalizes loose H:M(:S) to strict Postgres-style `HH:MM:SS` for timesheet persistence.
 */
export function toTimesheetWireTimeHms(val: string): string {
    const s = String(val).trim();
    if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(s)) {
        const parts = s.split(":");
        const h = parts[0]!.padStart(2, "0");
        const m = parts[1]!.padStart(2, "0");
        const sec = parts[2] ?? "00";
        return `${h}:${m}:${sec}`;
    }
    return s;
}
