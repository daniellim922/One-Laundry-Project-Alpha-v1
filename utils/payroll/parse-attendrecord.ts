/**
 * Pure parsing logic for AttendRecord-style Excel files.
 * Runs in both Node and browser - no fs/path or other Node APIs.
 */

export type AttendRecordDate = {
    dateIn: string;
    timeIn: string;
    dateOut: string;
    timeOut: string;
};

export type AttendRecordWorker = {
    userId: string;
    name: string;
    dates: AttendRecordDate[];
};

export type AttendRecordOutput = {
    attendanceDate: { startDate: string; endDate: string };
    tablingDate: string;
    workers: AttendRecordWorker[];
};

type CellValue = string | number | null;
type Row = CellValue[];
type Rows = Row[];

export function parseAttendRecord(rows: Rows): AttendRecordOutput {
    // Parse "Attendance date:01/01/2026 ~01/28/2026" (can be in any of the first rows)
    let attendanceDateMatch: RegExpMatchArray | null = null;
    for (const row of rows.slice(0, 10)) {
        if (!Array.isArray(row)) continue;
        const cell = row.find(
            (c) => typeof c === "string" && c.startsWith("Attendance date:"),
        );
        if (cell) {
            attendanceDateMatch = String(cell).match(
                /Attendance date:(\d{2}\/\d{2}\/\d{4})\s*~\s*(\d{2}\/\d{2}\/\d{4})/,
            );
            break;
        }
    }
    const startDate = attendanceDateMatch?.[1];
    const endDate = attendanceDateMatch?.[2];

    // Parse "Tabling date:01/28/2026 17:10:10"
    let tablingDate = "";
    for (const row of rows) {
        if (!Array.isArray(row)) continue;
        for (const cell of row) {
            if (typeof cell === "string" && cell.includes("Tabling date:")) {
                tablingDate = (
                    cell.match(/Tabling date:\s*(.+)$/)?.[1] ?? ""
                ).trim();
                break;
            }
        }
        if (tablingDate) break;
    }

    const startDateParts = startDate?.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    const startMonth = startDateParts?.[2];
    const startYear = startDateParts?.[3];

    function formatDate(day: number): string {
        const d = String(day).padStart(2, "0");
        return `${d}/${startMonth}/${startYear}`;
    }

    function parseTimeCell(
        val: CellValue,
    ): { timeIn: string | null; timeOut: string } | null {
        if (val == null || val === "") return null;
        const s = String(val).trim();
        if (!s) return null;
        const parts = s.split(/\s*\n\s*/);
        const timeIn = (parts[0] ?? "").trim() || null;
        const timeOut = (parts[1] ?? "").trim() || "     ";
        return { timeIn, timeOut };
    }

    const workers: AttendRecordWorker[] = [];
    let i = 2;

    while (i < rows.length) {
        const row = rows[i];
        if (!Array.isArray(row)) {
            i++;
            continue;
        }

        const userCol = row.findIndex((c) => c === "UserID:");
        if (userCol === -1) {
            i++;
            continue;
        }

        const userId = String(row[userCol + 2] ?? "").trim();
        const nameCol = row.findIndex((c) => c === "Name:");
        const name =
            (nameCol >= 0 ? String(row[nameCol + 1] ?? "").trim() : "") || "";

        const dates: AttendRecordDate[] = [];
        i++;
        const headerRow = rows[i];
        if (!Array.isArray(headerRow)) {
            workers.push({ userId, name, dates });
            i++;
            continue;
        }

        const dayHeaderIndexes = headerRow.flatMap((cell, index) => {
            const dayNum =
                typeof cell === "number" ? cell : parseInt(String(cell), 10);

            return Number.isNaN(dayNum) || dayNum < 1 || dayNum > 31 ? [] : [index];
        });
        const dayColStart = dayHeaderIndexes[0] ?? -1;
        const dayColEnd = dayHeaderIndexes.at(-1) ?? dayColStart;
        i++;

        while (i < rows.length) {
            const dataRow = rows[i];
            if (!Array.isArray(dataRow)) {
                i++;
                break;
            }
            if (dataRow.some((c) => c === "UserID:")) break;

            const hasTime = dataRow.some((c) => {
                if (c == null || c === "") return false;
                return (
                    /^\d{1,2}:\d{2}\s*\n/.test(String(c)) ||
                    /^\d{1,2}:\d{2}$/.test(String(c).split(/\n/)[0] ?? "")
                );
            });
            if (!hasTime) {
                i++;
                break;
            }

            for (
                let col = dayColStart;
                col <= dayColEnd && col < dataRow.length;
                col++
            ) {
                const headerVal = headerRow[col];
                const dayNum =
                    typeof headerVal === "number"
                        ? headerVal
                        : parseInt(String(headerVal), 10);
                if (Number.isNaN(dayNum) || dayNum < 1 || dayNum > 31) continue;
                const parsed = parseTimeCell(dataRow[col]);
                if (!parsed || !parsed.timeIn) continue;
                dates.push({
                    dateIn: formatDate(dayNum),
                    timeIn: parsed.timeIn,
                    dateOut: formatDate(dayNum),
                    timeOut: parsed.timeOut,
                });
            }
            i++;
        }

        workers.push({ userId, name, dates });
    }

    return {
        attendanceDate: {
            startDate: startDate ?? "",
            endDate: endDate ?? "",
        },
        tablingDate,
        workers,
    };
}
