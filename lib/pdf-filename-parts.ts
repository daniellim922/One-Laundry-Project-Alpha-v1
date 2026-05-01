/** Shared filename / date fragments for PDF downloads (routes + dashboard). */

import { dateToLocalIsoYmd } from "@/utils/time/calendar-date";

export function safeFilenamePart(s: string): string {
    return String(s).replace(/[/\\:*?"<>|]/g, "-").trim();
}

export function isoDate(val: unknown): string {
    if (val instanceof Date) return dateToLocalIsoYmd(val);
    return String(val).slice(0, 10);
}

export function isoToDdmmyyyy(iso: string): string {
    const s = String(iso).slice(0, 10);
    const [y, m, d] = s.split("-");
    if (!y || !m || !d) return s;
    return `${d}_${m}_${y}`;
}
