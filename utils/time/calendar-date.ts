export function formatDmyInput(raw: string): string {
    const digits = raw.replace(/\D/g, "").slice(0, 8);
    if (digits.length <= 2) return digits;
    if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function isValidDateParts(year: number, monthOneBased: number, day: number): boolean {
    const d = new Date(year, monthOneBased - 1, day);
    return (
        d.getFullYear() === year &&
        d.getMonth() === monthOneBased - 1 &&
        d.getDate() === day
    );
}

export function parseDmyToIsoStrict(value: string): string | null {
    const match = value.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!match) return null;

    const day = Number.parseInt(match[1], 10);
    const month = Number.parseInt(match[2], 10);
    const year = Number.parseInt(match[3], 10);

    if (!isValidDateParts(year, month, day)) return null;

    return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function parseIsoToDateStrict(value: string): Date | null {
    const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return null;

    const year = Number.parseInt(match[1], 10);
    const month = Number.parseInt(match[2], 10);
    const day = Number.parseInt(match[3], 10);

    if (!isValidDateParts(year, month, day)) return null;

    return new Date(year, month - 1, day);
}

export function isIsoDateStrict(value: string): boolean {
    return parseIsoToDateStrict(value) !== null;
}

export function isoToDmy(value: string): string {
    const date = parseIsoToDateStrict(value);
    if (!date) return "";

    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = String(date.getFullYear()).padStart(4, "0");

    return `${day}/${month}/${year}`;
}

/** Local calendar YYYY-MM-DD (wire format; matches `<input type="date">`). */
export function dateToLocalIsoYmd(d: Date = new Date()): string {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
}

/** Local calendar YYYY-MM-DD from a calendar Date (same encoding as {@link dateToLocalIsoYmd}). */
export function dateToIso(date: Date): string {
    return dateToLocalIsoYmd(date);
}

/** Compare two ISO YYYY-MM-DD strings (inclusive calendar order). */
export function compareIsoDate(a: string, b: string): number {
    if (a === b) return 0;
    return a < b ? -1 : 1;
}

export function clampIsoDateToRange(
    iso: string,
    min?: string,
    max?: string,
): string {
    if (!isIsoDateStrict(iso)) return iso;
    let out = iso;
    if (min && isIsoDateStrict(min) && compareIsoDate(out, min) < 0) {
        out = min;
    }
    if (max && isIsoDateStrict(max) && compareIsoDate(out, max) > 0) {
        out = max;
    }
    return out;
}
