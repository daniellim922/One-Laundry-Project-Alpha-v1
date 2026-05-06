import type { AttendRecordDate } from "@/utils/payroll/parse-attendrecord";
import { normalizeDateToDmy } from "@/utils/payroll/parse-attendrecord";
import { parseDmyToIsoStrict, parseIsoToDateStrict } from "@/utils/time/calendar-date";

const PARSER_EMPTY_SECOND_LINE = "     ";

function isBlankOrPlaceholderSecondLine(timeOut: string): boolean {
    const t = String(timeOut ?? "").trim();
    return t === "" || t === PARSER_EMPTY_SECOND_LINE.trim();
}

/**
 * Next calendar day as strict `DD/MM/YYYY`.
 */
function nextDmyStrict(dmy: string): string | null {
    const iso = parseDmyToIsoStrict(dmy);
    if (!iso) return null;
    const d = parseIsoToDateStrict(iso);
    if (!d) return null;
    d.setDate(d.getDate() + 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${day}/${m}/${y}`;
}

function dmyToComparableIso(dmy: string): string | null {
    const normalized = normalizeDateToDmy(dmy) ?? dmy;
    const strict =
        /^\d{2}\/\d{2}\/\d{4}$/.test(normalized.trim()) ? normalized : null;
    if (strict) return parseDmyToIsoStrict(strict);
    const m = dmy.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!m) return null;
    const pad = `${m[1]!.padStart(2, "0")}/${m[2]!.padStart(2, "0")}/${m[3]}`;
    return parseDmyToIsoStrict(pad);
}

function compareDmy(a: string, b: string): number {
    const ia = dmyToComparableIso(a);
    const ib = dmyToComparableIso(b);
    if (ia && ib) return ia.localeCompare(ib);
    return a.localeCompare(b);
}

function normalizePeriodStartToIso(periodStartDate: string): string | null {
    const s = periodStartDate.trim();
    if (!s) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
        return parseIsoToDateStrict(s) ? s : null;
    }
    const dmy = normalizeDateToDmy(s);
    if (!dmy) return null;
    const m = dmy.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (m) return parseDmyToIsoStrict(dmy);
    const loose = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!loose) return null;
    const pad = `${loose[1]!.padStart(2, "0")}/${loose[2]!.padStart(2, "0")}/${loose[3]}`;
    return parseDmyToIsoStrict(pad);
}

/**
 * Re-pairs AttendRecord "same-date" cells into cross-midnight timesheet rows for a **night shift**
 * export layout (row 1 = morning clock-out of the previous night shift; row 2 = evening clock-in
 * starting tonight's shift). The parser stores row 1 in `timeIn` and row 2 in `timeOut`.
 *
 * @param rawEntries — one {@link AttendRecordDate} per populated day column (always `dateIn === dateOut` from the parser).
 * @param periodStartDate — optional `DD/MM/YYYY` or `YYYY-MM-DD`; when set, entries strictly before this calendar day are removed before transforming.
 */
export function transformNightShiftEntries(
    rawEntries: AttendRecordDate[],
    periodStartDate: string,
): AttendRecordDate[] {
    let entries = rawEntries;
    const periodIso = normalizePeriodStartToIso(periodStartDate);
    if (periodIso) {
        entries = rawEntries.filter((e) => {
            const iso = dmyToComparableIso(e.dateIn);
            return iso && iso >= periodIso;
        });
    }

    const sorted = [...entries].sort((a, b) =>
        compareDmy(a.dateIn, b.dateIn),
    );
    const n = sorted.length;
    if (n === 0) {
        return [];
    }

    const result: AttendRecordDate[] = [];

    function pushPair(
        dateInDmy: string,
        timeIn: string,
        dateOutDmy: string,
        timeOut: string,
    ) {
        result.push({
            dateIn: dateInDmy,
            timeIn,
            dateOut: dateOutDmy,
            timeOut,
        });
    }

    for (let i = 0; i < n - 1; i++) {
        const cur = sorted[i]!;
        const nxt = sorted[i + 1]!;
        const line1Cur = cur.timeIn.trim();
        const line2Cur = isBlankOrPlaceholderSecondLine(cur.timeOut)
            ? ""
            : String(cur.timeOut).trim();
        const line1Next = nxt.timeIn.trim();

        let evening: string | null;
        if (i === 0) {
            evening = line2Cur || line1Cur;
        } else {
            evening = line2Cur || null;
        }

        if (evening && line1Next) {
            pushPair(cur.dateIn, evening, nxt.dateIn, line1Next);
        }
    }

    const last = sorted[n - 1]!;
    const l1 = last.timeIn.trim();
    const l2 = isBlankOrPlaceholderSecondLine(last.timeOut) ? "" : last.timeOut.trim();

    if (n === 1) {
        const evening = l2 || l1;
        const dateOut = nextDmyStrict(last.dateIn);
        if (dateOut) {
            pushPair(last.dateIn, evening, dateOut, PARSER_EMPTY_SECOND_LINE);
        }
        return result;
    }

    if (l2) {
        const dateOut = nextDmyStrict(last.dateIn);
        if (dateOut) {
            pushPair(last.dateIn, l2, dateOut, PARSER_EMPTY_SECOND_LINE);
        }
    }

    return result;
}
