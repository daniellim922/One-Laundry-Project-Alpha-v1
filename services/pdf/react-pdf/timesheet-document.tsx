"use no memo";

import { View, Text, StyleSheet } from "@react-pdf/renderer";

import { tableStyles } from "./primitives";

export type TimesheetEntry = {
    dateIn: string | Date;
    timeIn: string | Date | null;
    dateOut: string | Date | null;
    timeOut: string | Date | null;
    hours: string | number;
};

export type TimesheetData = {
    entries: TimesheetEntry[];
    periodStart: string;
    periodEnd: string;
    workerName: string;
};

const enGbDayMonthShort = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
});
const enGbDayMonthLongYear = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
});

function toLocalDate(value: string | Date): Date {
    if (value instanceof Date) return value;
    const s = String(value).slice(0, 10);
    const [y, m, d] = s.split("-").map(Number);
    return new Date(y!, m! - 1, d);
}

function fmtDayMonthShort(d: Date): string {
    return enGbDayMonthShort.format(d);
}

function fmtDayMonthLongYear(d: Date): string {
    return enGbDayMonthLongYear.format(d);
}

function fmtHm(value: string | Date | null): string {
    if (value == null) return "-";
    if (value instanceof Date) {
        const h = String(value.getHours()).padStart(2, "0");
        const m = String(value.getMinutes()).padStart(2, "0");
        return `${h}:${m}`;
    }
    const s = String(value);
    if (/^\d{2}:\d{2}(:\d{2})?$/.test(s)) return s.slice(0, 5);
    if (/T/.test(s)) {
        const d = new Date(s);
        if (!Number.isNaN(d.getTime())) {
            const h = String(d.getHours()).padStart(2, "0");
            const m = String(d.getMinutes()).padStart(2, "0");
            return `${h}:${m}`;
        }
    }
    return "-";
}

function dateKey(value: string | Date): string {
    if (value instanceof Date) {
        return value.toISOString().slice(0, 10);
    }
    return String(value).slice(0, 10);
}

const s = StyleSheet.create({
    shell: {
        border: "1pt solid #000",
        backgroundColor: "#fff",
        color: "#000",
    },
    titleBar: {
        borderBottom: "1pt solid #000",
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 8,
    },
    titleText: {
        textAlign: "center",
        fontSize: 11,
        fontWeight: "bold",
        letterSpacing: 3,
    },
    content: {
        padding: 16,
        gap: 8,
    },
    metaLabel: {
        fontSize: 8,
        color: "#666",
    },
    metaValue: {
        fontSize: 8,
        fontWeight: "bold",
    },
    metaRow: {
        flexDirection: "row",
        gap: 4,
        marginBottom: 2,
    },
    colDateIn: { width: "22%", paddingLeft: 4 },
    colTimeIn: { width: "18%", textAlign: "center" },
    colDateOut: { width: "22%", textAlign: "center" },
    colTimeOut: { width: "18%", textAlign: "center" },
    colHours: { width: "20%", textAlign: "right", paddingRight: 4 },
});

export function TimesheetPage({ data }: { data: TimesheetData }) {
    const { entries, periodStart, periodEnd, workerName } = data;
    const start = toLocalDate(periodStart);
    const end = toLocalDate(periodEnd);

    const entriesByDateIn = new Map<string, TimesheetEntry[]>();
    for (const entry of entries) {
        const key = dateKey(entry.dateIn);
        const existing = entriesByDateIn.get(key);
        if (existing) existing.push(entry);
        else entriesByDateIn.set(key, [entry]);
    }

    const periodDateKeys: string[] = [];
    const cursor = new Date(start);
    while (cursor <= end) {
        periodDateKeys.push(
            cursor.toISOString().slice(0, 10),
        );
        cursor.setDate(cursor.getDate() + 1);
    }

    const totalHours = entries.reduce(
        (sum, e) => sum + Number(e.hours),
        0,
    );

    const periodLabel = `${fmtDayMonthLongYear(start)} to ${fmtDayMonthLongYear(end)}`;

    return (
        <View style={s.shell}>
            <View style={s.titleBar}>
                <Text style={s.titleText}>TIMESHEET</Text>
            </View>

            <View style={s.content}>
                {/* Metadata */}
                <View>
                    <View style={s.metaRow}>
                        <Text style={s.metaLabel}>Employee Details: </Text>
                        <Text
                            style={[
                                s.metaValue,
                                {
                                    textTransform: "uppercase",
                                    letterSpacing: 0.5,
                                },
                            ]}>
                            {workerName}
                        </Text>
                    </View>
                    <View style={s.metaRow}>
                        <Text style={s.metaLabel}>Period: </Text>
                        <Text style={s.metaValue}>{periodLabel}</Text>
                    </View>
                </View>

                {/* Table */}
                <View>
                    {/* Header */}
                    <View style={tableStyles.headerRow}>
                        <Text style={[tableStyles.headerCell, s.colDateIn]}>
                            Date In
                        </Text>
                        <Text style={[tableStyles.headerCell, s.colTimeIn]}>
                            Time in
                        </Text>
                        <Text style={[tableStyles.headerCell, s.colDateOut]}>
                            Date Out
                        </Text>
                        <Text style={[tableStyles.headerCell, s.colTimeOut]}>
                            Time Out
                        </Text>
                        <Text style={[tableStyles.headerCell, s.colHours]}>
                            Hours
                        </Text>
                    </View>

                    {/* Body */}
                    {periodDateKeys.map((dayKey) => {
                        const dayEntries = entriesByDateIn.get(dayKey) ?? [];
                        if (dayEntries.length === 0) {
                            return (
                                <View key={`missing-${dayKey}`} style={tableStyles.bodyRow}>
                                    <Text style={[tableStyles.bodyCell, s.colDateIn, { fontWeight: "medium" }]}>
                                        {fmtDayMonthShort(toLocalDate(dayKey))}
                                    </Text>
                                    <Text style={[tableStyles.bodyCell, s.colTimeIn]}>-</Text>
                                    <Text style={[tableStyles.bodyCell, s.colDateOut]}>-</Text>
                                    <Text style={[tableStyles.bodyCell, s.colTimeOut]}>-</Text>
                                    <Text style={[tableStyles.bodyCell, s.colHours]}>
                                        0.00 Hrs
                                    </Text>
                                </View>
                            );
                        }

                        return dayEntries.map((entry, idx) => (
                            <View
                                key={`${dayKey}-${idx}`}
                                style={tableStyles.bodyRow}>
                                <Text
                                    style={[
                                        tableStyles.bodyCell,
                                        s.colDateIn,
                                        { fontWeight: "medium" },
                                    ]}>
                                    {fmtDayMonthShort(toLocalDate(entry.dateIn))}
                                </Text>
                                <Text style={[tableStyles.bodyCell, s.colTimeIn]}>
                                    {fmtHm(entry.timeIn)}
                                </Text>
                                <Text style={[tableStyles.bodyCell, s.colDateOut]}>
                                    {entry.dateOut
                                        ? fmtDayMonthShort(
                                              toLocalDate(entry.dateOut),
                                          )
                                        : "-"}
                                </Text>
                                <Text style={[tableStyles.bodyCell, s.colTimeOut]}>
                                    {fmtHm(entry.timeOut)}
                                </Text>
                                <Text style={[tableStyles.bodyCell, s.colHours]}>
                                    {Number(entry.hours).toFixed(2)} Hrs
                                </Text>
                            </View>
                        ));
                    })}

                    {/* Footer */}
                    <View style={tableStyles.footerRow}>
                        <Text
                            style={[
                                tableStyles.footerCell,
                                { width: "80%", paddingLeft: 4 },
                            ]}>
                            Total Working Hours
                        </Text>
                        <Text
                            style={[
                                tableStyles.footerCell,
                                {
                                    width: "20%",
                                    textAlign: "right",
                                    paddingRight: 4,
                                },
                            ]}>
                            {totalHours.toFixed(2)} Hrs
                        </Text>
                    </View>
                </View>
            </View>
        </View>
    );
}
