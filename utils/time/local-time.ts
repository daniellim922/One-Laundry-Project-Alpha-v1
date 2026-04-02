/** Local time display as HH:MM (truncates HH:MM:SS and preserves already-HH:MM strings). */
export function localTimeHm(t: string | null | undefined): string {
    const s = String(t ?? "").trim();
    if (!s) return "";
    return s.length >= 5 ? s.slice(0, 5) : s;
}

