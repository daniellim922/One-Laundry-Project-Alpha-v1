export function isHmTimeStrict(value: string): boolean {
    return /^([01]\d|2[0-3]):([0-5]\d)$/.test(value.trim());
}

export function normalizeHmTime(value: string): string {
    const match = value.trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
    if (!match) return "";
    const hour = Number.parseInt(match[1], 10);
    const minute = Number.parseInt(match[2], 10);
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return "";
    return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}
