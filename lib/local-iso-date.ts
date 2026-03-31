/** Local calendar date as YYYY-MM-DD (matches browser date input). */
export function localIsoDateYmd(d: Date = new Date()): string {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
}

/** Local calendar date formatted as DD/MM/YYYY (en-GB). */
export function localDateDmy(d: string | Date): string {
    const date = d instanceof Date ? d : new Date(`${d}T00:00:00`);
    return date.toLocaleDateString("en-GB", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    });
}
