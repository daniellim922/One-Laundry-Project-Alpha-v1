"use no memo";

import { View, Text, StyleSheet } from "@react-pdf/renderer";

import {
    buildVoucherLineItems,
    type VoucherLineItem,
} from "@/services/payroll/voucher-line-items";

import {
    DocumentShell,
    MetadataTable,
    SignatureSection,
    tableStyles,
} from "./primitives";

const currencyFmt = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

function fmtQty(n: number, unit: string): string {
    if (unit === "day") return String(Math.round(n));
    return n.toFixed(2);
}

export type PayrollVoucherData = {
    voucher: {
        voucherNumber: string | null;
        employmentType: string | null;
        monthlyPay: number | null;
        hourlyRate: number | null;
        minimumWorkingHours?: number | null;
        totalHoursWorked: number | null;
        hoursNotMet?: number | null;
        hoursNotMetDeduction?: number | null;
        overtimeHours: number | null;
        overtimePay: number | null;
        restDays: number | null;
        restDayRate: number | null;
        restDayPay: number | null;
        publicHolidays: number | null;
        publicHolidayPay: number | null;
        cpf: number | null;
        advance?: number | null;
        adhoc?: Array<{ name: string; amount: number }>;
        subTotal: number | null;
        grandTotal: number | null;
        paymentMethod: string | null;
        payNowPhone?: string | null;
        bankAccountNumber?: string | null;
    };
    periodLabel: string;
    voucherDate: string;
    workerName: string;
    /** Bundled PNG data URL for the payment approver line (server-filled). */
    approverSignatureDataUrl?: string | null;
};

const s = StyleSheet.create({
    itemRow: {
        flexDirection: "row",
        borderBottom: "0.5pt solid #ccc",
        paddingVertical: 4,
    },
    descCell: {
        width: "40%",
        paddingLeft: 4,
        fontSize: 8,
        fontWeight: "medium",
    },
    qtyCell: { width: "10%", textAlign: "center", fontSize: 8 },
    unitCell: { width: "8%", fontSize: 8, paddingLeft: 2 },
    xCell: { width: "4%", textAlign: "center", fontSize: 8 },
    rateCell: { width: "14%", textAlign: "center", fontSize: 8 },
    dollarCell: {
        width: "4%",
        borderLeft: "1pt solid #000",
        paddingLeft: 6,
        fontSize: 8,
    },
    amountCell: {
        width: "20%",
        textAlign: "right",
        paddingRight: 6,
        fontSize: 8,
    },
    subtotalRow: {
        flexDirection: "row",
        borderTop: "0.5pt solid #999",
        paddingVertical: 5,
    },
    subtotalLabel: {
        width: "76%",
        paddingLeft: 4,
        fontSize: 7,
        fontWeight: "bold",
        textTransform: "uppercase",
        letterSpacing: 1,
    },
    subtotalAmount: {
        width: "24%",
        borderLeft: "1pt solid #000",
        textAlign: "right",
        paddingRight: 6,
        fontSize: 8,
        fontWeight: "bold",
    },
    footerRow: {
        flexDirection: "row",
        borderTop: "2pt solid #000",
        paddingVertical: 6,
    },
    grandLabel: {
        width: "20%",
        paddingLeft: 4,
        fontSize: 9,
        fontWeight: "bold",
    },
    paymentMethod: {
        width: "56%",
        textAlign: "right",
        paddingRight: 8,
        fontSize: 8,
    },
    grandAmount: {
        width: "24%",
        borderLeft: "1pt solid #000",
        textAlign: "right",
        paddingRight: 6,
        fontSize: 10,
        fontWeight: "bold",
    },
});

function ItemRow({ item }: { item: VoucherLineItem }) {
    return (
        <View style={s.itemRow}>
            <Text style={s.descCell}>{item.description}</Text>
            <Text style={s.qtyCell}>
                {item.qty != null ? fmtQty(item.qty, item.unit ?? "") : ""}
            </Text>
            <Text style={s.unitCell}>{item.unit ?? ""}</Text>
            <Text style={s.xCell}>{item.qty != null ? "x" : ""}</Text>
            <Text style={s.rateCell}>
                {item.rate != null ? `$${currencyFmt.format(item.rate)}` : ""}
            </Text>
            <Text style={s.dollarCell}>$</Text>
            <Text style={s.amountCell}>
                {item.amount < 0 ? "-" : ""}
                {currencyFmt.format(Math.abs(item.amount))}
            </Text>
        </View>
    );
}

export function buildLineItems(voucher: PayrollVoucherData["voucher"]) {
    return buildVoucherLineItems(voucher);
}

function paymentMethodDisplay(voucher: PayrollVoucherData["voucher"]): string {
    const base = voucher.paymentMethod ?? "Cheque / Cash / Bank Transfer";
    if (voucher.paymentMethod === "PayNow" && voucher.payNowPhone) {
        return `PayNow (${voucher.payNowPhone})`;
    }
    if (
        voucher.paymentMethod === "Bank Transfer" &&
        voucher.bankAccountNumber
    ) {
        return `Bank Transfer (${voucher.bankAccountNumber})`;
    }
    return base;
}

export function PayrollVoucherPage({ data }: { data: PayrollVoucherData }) {
    const {
        voucher,
        periodLabel,
        voucherDate,
        workerName,
        approverSignatureDataUrl,
    } = data;
    const {
        earnings,
        deductions,
        adhocItems,
        hoursNotMetItem,
        subTotal,
        grandTotal,
    } = buildLineItems(voucher);

    return (
        <DocumentShell title="PAYMENT VOUCHER">
            <MetadataTable
                uppercaseLeftValue
                rows={[
                    {
                        leftLabel: "Voucher No:",
                        leftValue: voucher.voucherNumber ?? "—",
                        rightLabel: "Date:",
                        rightValue: voucherDate,
                    },
                    {
                        leftLabel: "Pay to:",
                        leftValue: workerName,
                        rightLabel: "Period:",
                        rightValue: periodLabel,
                    },
                    {
                        leftLabel: "Min. Hours:",
                        leftValue:
                            voucher.minimumWorkingHours != null
                                ? voucher.minimumWorkingHours.toFixed(2)
                                : "—",
                        rightLabel: "Hours Worked:",
                        rightValue:
                            voucher.totalHoursWorked != null
                                ? voucher.totalHoursWorked.toFixed(2)
                                : "—",
                    },
                ]}
            />

            {/* Header row */}
            <View>
                <View style={tableStyles.headerRow}>
                    <Text
                        style={[
                            tableStyles.headerCell,
                            { width: "40%", paddingLeft: 4 },
                        ]}>
                        DESCRIPTION
                    </Text>
                    <Text
                        style={[
                            tableStyles.headerCell,
                            { width: "10%", textAlign: "center" },
                        ]}>
                        QTY
                    </Text>
                    <Text style={[tableStyles.headerCell, { width: "8%" }]} />
                    <Text style={[tableStyles.headerCell, { width: "4%" }]} />
                    <Text
                        style={[
                            tableStyles.headerCell,
                            { width: "14%", textAlign: "center" },
                        ]}>
                        RATE
                    </Text>
                    <Text
                        style={[
                            tableStyles.headerCell,
                            {
                                width: "24%",
                                textAlign: "center",
                                borderLeft: "1pt solid #000",
                            },
                        ]}>
                        AMOUNT
                    </Text>
                </View>

                {/* Earnings */}
                {earnings.map((item, i) => (
                    <ItemRow key={`e-${i}`} item={item} />
                ))}

                {/* Hours not met (before subtotal) */}
                {hoursNotMetItem ? (
                    <ItemRow key="hours-not-met" item={hoursNotMetItem} />
                ) : null}

                {/* Subtotal */}
                <View style={s.subtotalRow}>
                    <Text style={s.subtotalLabel}>Subtotal</Text>
                    <Text style={s.subtotalAmount}>
                        ${currencyFmt.format(subTotal)}
                    </Text>
                </View>

                {/* Deductions */}
                {deductions.map((item, i) => (
                    <ItemRow key={`d-${i}`} item={item} />
                ))}

                {adhocItems.map((item, i) => (
                    <ItemRow key={`a-${i}`} item={item} />
                ))}

                {/* Grand Total footer */}
                <View style={s.footerRow}>
                    <Text style={s.grandLabel}>Grand Total</Text>
                    <Text style={s.paymentMethod}>
                        {paymentMethodDisplay(voucher)}
                    </Text>
                    <Text style={s.grandAmount}>
                        ${currencyFmt.format(grandTotal)}
                    </Text>
                </View>
            </View>

            <SignatureSection
                approvedLabel="Payment approved"
                receivedLabel="Payment received"
                approverName="Alvis Ong Thai Ying"
                receiverName={workerName}
                approvedDate={voucherDate}
                approverSignatureDataUrl={approverSignatureDataUrl}
            />
        </DocumentShell>
    );
}
