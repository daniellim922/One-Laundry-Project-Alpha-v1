import type { SelectTimesheet } from "@/db/tables/timesheetTable";
import {
    dateFromIsoLocalMidnight,
    timesheetDateInKey,
} from "@/utils/time/iso-local-midnight";
import {
    formatEnGbDayMonthLongYear,
    formatEnGbDayMonthShort,
} from "@/utils/time/intl-en-gb";
import { localTimeHm } from "@/utils/time/local-time";
import {
    Table,
    TableHeader,
    TableBody,
    TableFooter,
    TableRow,
    TableHead,
    TableCell,
} from "@/components/ui/table";

interface SummarizedTimesheetProps {
    entries: Pick<SelectTimesheet, "dateIn" | "timeIn" | "dateOut" | "timeOut" | "hours">[];
    payroll: { periodStart: string; periodEnd: string };
    workerName: string;
}

export function SummarizedTimesheet({
    entries,
    payroll,
    workerName,
}: SummarizedTimesheetProps) {
    const start = dateFromIsoLocalMidnight(
        timesheetDateInKey(payroll.periodStart),
    );
    const end = dateFromIsoLocalMidnight(timesheetDateInKey(payroll.periodEnd));
    const entriesByDateIn = new Map<
        string,
        Pick<
            SelectTimesheet,
            "dateIn" | "timeIn" | "dateOut" | "timeOut" | "hours"
        >[]
    >();
    for (const entry of entries) {
        const key = timesheetDateInKey(entry.dateIn);
        const existing = entriesByDateIn.get(key);
        if (existing) {
            existing.push(entry);
        } else {
            entriesByDateIn.set(key, [entry]);
        }
    }

    const periodDateKeys: string[] = [];
    const cursor = new Date(start);
    while (cursor <= end) {
        periodDateKeys.push(timesheetDateInKey(cursor));
        cursor.setDate(cursor.getDate() + 1);
    }

    const totalHours = entries.reduce((sum, e) => sum + Number(e.hours), 0);

    const periodLabel = `${formatEnGbDayMonthLongYear(start)} to ${formatEnGbDayMonthLongYear(end)}`;

    return (
        <div className="voucher-download-root overflow-hidden border border-neutral-300 bg-white text-black print:border-black print:break-inside-avoid timesheet-download-compact">
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
                            Period:{" "}
                        </span>
                        <span className="font-semibold">{periodLabel}</span>
                    </p>
                </div>

                {/* Table */}
                <Table className="w-full border-collapse text-sm [&_th]:align-middle [&_td]:align-middle print:text-xs">
                    <TableHeader>
                        <TableRow className="border-y-2 border-black hover:bg-white">
                            <TableHead className="py-2 pl-2 text-left font-semibold text-black print:py-1 print:pl-1">
                                Date In
                            </TableHead>
                            <TableHead className="py-2 text-center font-semibold text-black print:py-1">
                                Time in
                            </TableHead>
                            <TableHead className="py-2 text-center font-semibold text-black print:py-1">
                                Date Out
                            </TableHead>
                            <TableHead className="py-2 text-center font-semibold text-black print:py-1">
                                Time Out
                            </TableHead>
                            <TableHead className="py-2 pr-2 text-right font-semibold text-black print:py-1 print:pr-1">
                                Hours
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {periodDateKeys.map((dayKey) => {
                            const dayEntries = entriesByDateIn.get(dayKey) ?? [];
                            if (dayEntries.length === 0) {
                                return (
                                    <TableRow
                                        key={`missing-${dayKey}`}
                                        className="border-b border-neutral-200 text-black">
                                        <TableCell className="py-2 pl-2 font-medium print:py-0.5 print:pl-1">
                                            {formatEnGbDayMonthShort(
                                                dateFromIsoLocalMidnight(dayKey),
                                            )}
                                        </TableCell>
                                        <TableCell className="py-2 text-center print:py-0.5">
                                            -
                                        </TableCell>
                                        <TableCell className="py-2 text-center print:py-0.5">
                                            -
                                        </TableCell>
                                        <TableCell className="py-2 text-center print:py-0.5">
                                            -
                                        </TableCell>
                                        <TableCell className="py-2 pr-2 text-right print:py-0.5 print:pr-1">
                                            0.00 Hrs
                                        </TableCell>
                                    </TableRow>
                                );
                            }

                            return dayEntries.map((entry, idx) => (
                                <TableRow
                                    key={`${dayKey}-${String(entry.timeIn)}-${String(entry.timeOut)}-${idx}`}
                                    className="border-b border-neutral-200">
                                    <TableCell className="py-2 pl-2 font-medium print:py-0.5 print:pl-1">
                                        {formatEnGbDayMonthShort(
                                            dateFromIsoLocalMidnight(
                                                timesheetDateInKey(entry.dateIn),
                                            ),
                                        )}
                                    </TableCell>
                                    <TableCell className="py-2 text-center print:py-0.5">
                                        {localTimeHm(entry.timeIn)}
                                    </TableCell>
                                    <TableCell className="py-2 text-center print:py-0.5">
                                        {formatEnGbDayMonthShort(
                                            dateFromIsoLocalMidnight(
                                                timesheetDateInKey(
                                                    entry.dateOut,
                                                ),
                                            ),
                                        )}
                                    </TableCell>
                                    <TableCell className="py-2 text-center print:py-0.5">
                                        {localTimeHm(entry.timeOut)}
                                    </TableCell>
                                    <TableCell className="py-2 pr-2 text-right print:py-0.5 print:pr-1">
                                        {Number(entry.hours).toFixed(2)} Hrs
                                    </TableCell>
                                </TableRow>
                            ));
                        })}
                    </TableBody>
                    <TableFooter className="bg-white print:bg-white">
                        <TableRow className="border-t-2 border-black hover:bg-white">
                            <TableCell
                                className="py-3 pl-2 font-semibold print:py-1 print:pl-1"
                                colSpan={4}>
                                Total Working Hours
                            </TableCell>
                            <TableCell className="py-3 pr-2 text-right font-semibold print:py-1 print:pr-1">
                                {totalHours.toFixed(2)} Hrs
                            </TableCell>
                        </TableRow>
                    </TableFooter>
                </Table>
            </div>
        </div>
    );
}
