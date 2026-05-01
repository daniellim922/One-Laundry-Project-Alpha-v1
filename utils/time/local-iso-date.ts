/** Local calendar date as YYYY-MM-DD (matches browser date input). */

/** Local calendar date formatted as DD/MM/YYYY (en-GB). */
export function localDateDmy(d: string | Date): string {
    const date = d instanceof Date ? d : new Date(`${d}T00:00:00`);
    return date.toLocaleDateString("en-GB", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    });
}
