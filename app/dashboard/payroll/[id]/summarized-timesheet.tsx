import type { SelectTimesheet } from "@/db/tables/payroll/timesheetTable";

interface SummarizedTimesheetProps {
    entries: Pick<SelectTimesheet, "dateIn" | "timeIn" | "dateOut" | "timeOut" | "hours">[];
    payroll: { periodStart: string; periodEnd: string };
    workerName: string;
}

function pad2(n: number): string {
    return String(n).padStart(2, "0");
}

function dateKey(d: string | Date): string {
    if (d instanceof Date) {
        return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
    }
    const s = String(d);
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
    const parsed = new Date(s + "T00:00:00");
    return `${parsed.getFullYear()}-${pad2(parsed.getMonth() + 1)}-${pad2(parsed.getDate())}`;
}

function dateFromKey(key: string): Date {
    return new Date(`${key}T00:00:00`);
}

function formatShortDate(d: Date): string {
    return d.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
    });
}

function formatTime24(t: string): string {
    const s = String(t);
    if (s.length >= 5) return s.slice(0, 5);
    return s;
}

function formatPeriod(d: Date): string {
    return d.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
    });
}

export function SummarizedTimesheet({
    entries,
    payroll,
    workerName,
}: SummarizedTimesheetProps) {
    const start = dateFromKey(dateKey(payroll.periodStart));
    const end = dateFromKey(dateKey(payroll.periodEnd));

    const entriesByDate = new Map(
        entries.map((e) => [dateKey(e.dateIn), e]),
    );

    const days: { date: Date; key: string; entry?: (typeof entries)[0] }[] = [];
    const cursor = new Date(start);
    while (cursor <= end) {
        const key = dateKey(cursor);
        days.push({
            date: new Date(cursor),
            key,
            entry: entriesByDate.get(key),
        });
        cursor.setDate(cursor.getDate() + 1);
    }

    const totalHours = entries.reduce((sum, e) => sum + Number(e.hours), 0);

    const periodLabel = `${formatPeriod(start)} to ${formatPeriod(end)}`;

    return (
        <div className="voucher-print-root overflow-hidden border border-neutral-300 bg-white text-black print:border-black print:break-inside-avoid timesheet-print-compact">
            {/* Header */}
            <div className="border-b border-neutral-300 px-8 pt-6 pb-4 print:border-black print:px-4 print:pt-3 print:pb-2">
                <h2 className="text-center text-xl font-bold tracking-[0.2em] text-neutral-900 print:text-base print:tracking-widest">
                    TIMESHEET
                </h2>
            </div>

            <div className="space-y-4 p-8 print:space-y-2 print:p-4">
                {/* Metadata */}
                <div className="space-y-2 text-sm print:space-y-1 print:text-xs">
                    <p>
                        <span className="font-medium text-neutral-600">
                            Employee Details:{" "}
                        </span>
                        <span className="font-semibold uppercase tracking-wide">
                            {workerName}
                        </span>
                    </p>
                    <p>
                        <span className="font-medium text-neutral-600">
                            Period Start Date  Period End Date:{" "}
                        </span>
                        <span className="font-semibold">{periodLabel}</span>
                    </p>
                </div>

                {/* Table */}
                <table className="w-full border-collapse text-sm [&_th]:align-middle [&_td]:align-middle print:text-xs">
                    <thead>
                        <tr className="border-y-2 border-black">
                            <th className="py-2 pl-2 text-left font-semibold print:py-1 print:pl-1">
                                Date(s)
                            </th>
                            <th className="py-2 text-center font-semibold print:py-1">
                                Time in
                            </th>
                            <th className="py-2 text-center font-semibold print:py-1">
                                Lunch Start
                            </th>
                            <th className="py-2 text-center font-semibold print:py-1">
                                Lunch End
                            </th>
                            <th className="py-2 text-center font-semibold print:py-1">
                                Time Out
                            </th>
                            <th className="py-2 pr-2 text-right font-semibold print:py-1 print:pr-1">
                                Hours Worked
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {days.map(({ date, key, entry }) => (
                            <tr
                                key={key}
                                className="border-b border-neutral-200">
                                <td className="py-2 pl-2 font-medium print:py-0.5 print:pl-1">
                                    {formatShortDate(date)}
                                </td>
                                <td className="py-2 text-center print:py-0.5">
                                    {entry
                                        ? formatTime24(String(entry.timeIn))
                                        : ""}
                                </td>
                                <td className="py-2 text-center print:py-0.5" />
                                <td className="py-2 text-center print:py-0.5" />
                                <td className="py-2 text-center print:py-0.5">
                                    {entry
                                        ? formatTime24(String(entry.timeOut))
                                        : ""}
                                </td>
                                <td className="py-2 pr-2 text-right print:py-0.5 print:pr-1">
                                    {entry
                                        ? `${Number(entry.hours).toFixed(2)} Hrs`
                                        : "0.00 Hrs"}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr className="border-t-2 border-black">
                            <td
                                className="py-3 pl-2 font-semibold print:py-1 print:pl-1"
                                colSpan={5}>
                                Total Working Hours
                            </td>
                            <td className="py-3 pr-2 text-right font-semibold print:py-1 print:pr-1">
                                {totalHours.toFixed(2)} Hrs
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
}
