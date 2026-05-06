"use no memo";

import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";

import {
    DocumentShell,
    MetadataTable,
    SignatureSection,
    tableStyles,
} from "./primitives";
import type { AdvanceLoanStatus, InstallmentStatus } from "@/types/status";

const currencyFmt = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

const enGbDayMonthLongYear = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
});

function formatDate(iso: string | null): string {
    if (!iso) return "—";
    const s = String(iso).slice(0, 10);
    const [y, m, d] = s.split("-").map(Number);
    if (y == null || m == null || d == null) return "—";
    const date = new Date(y, m - 1, d);
    return Number.isNaN(date.getTime()) ? "—" : enGbDayMonthLongYear.format(date);
}

export type AdvanceVoucherData = {
    request: {
        workerName: string;
        amountRequested: number;
        status: AdvanceLoanStatus;
        requestDate: string;
    };
    advances: {
        id: string;
        amount: number;
        status: InstallmentStatus;
        repaymentDate: string | null;
    }[];
    employeeSignature: string | null;
    employeeSignatureDate: string | null;
    managerSignature: string | null;
    managerSignatureDate: string | null;
};

const s = StyleSheet.create({
    page: {
        paddingHorizontal: 40,
        paddingVertical: 30,
        fontFamily: "Helvetica",
        fontSize: 9,
    },
    sectionLabel: {
        fontSize: 8,
        fontWeight: "bold",
        textTransform: "uppercase",
        letterSpacing: 1,
        color: "#555",
        marginBottom: 6,
    },
    colHash: { width: "10%", textAlign: "center", paddingLeft: 4 },
    colAmount: { width: "30%", paddingLeft: 4 },
    colDate: { width: "35%" },
    colStatus: { width: "25%" },
    declaration: {
        paddingHorizontal: 16,
        paddingVertical: 10,
    },
    declarationTitle: {
        fontSize: 8,
        fontWeight: "bold",
        color: "#555",
        marginBottom: 4,
    },
    declarationText: {
        fontSize: 8,
        lineHeight: 1.6,
        color: "#666",
    },
});

export function AdvanceVoucherDocument({
    data,
}: {
    data: AdvanceVoucherData;
}) {
    const { request, advances } = data;

    const totalAmount = advances.reduce((sum, a) => sum + a.amount, 0);
    const paidCount = advances.filter(
        (a) => a.status === "Installment Paid",
    ).length;
    const outstandingCount = advances.length - paidCount;

    return (
        <Document>
            <Page size="A4" style={s.page}>
                <DocumentShell title="ADVANCE REQUEST">
                    <MetadataTable
                        uppercaseLeftValue
                        rows={[
                            {
                                leftLabel: "Employee:",
                                leftValue: request.workerName,
                                rightLabel: "Date of Request:",
                                rightValue: formatDate(request.requestDate),
                            },
                            {
                                leftLabel: "Amount Requested:",
                                leftValue: `$${currencyFmt.format(request.amountRequested)}`,
                                rightLabel: "Status:",
                                rightValue: request.status,
                            },
                        ]}
                    />

                    {/* Repayment schedule */}
                    <View>
                        <Text style={s.sectionLabel}>Repayment Schedule</Text>

                        <View style={tableStyles.headerRow}>
                            <Text style={[tableStyles.headerCell, s.colHash]}>
                                #
                            </Text>
                            <Text
                                style={[tableStyles.headerCell, s.colAmount]}>
                                AMOUNT
                            </Text>
                            <Text style={[tableStyles.headerCell, s.colDate]}>
                                REPAYMENT DATE
                            </Text>
                            <Text
                                style={[tableStyles.headerCell, s.colStatus]}>
                                STATUS
                            </Text>
                        </View>

                        {advances.map((adv, i) => (
                            <View key={adv.id} style={tableStyles.bodyRow}>
                                <Text
                                    style={[tableStyles.bodyCell, s.colHash]}>
                                    {i + 1}
                                </Text>
                                <Text
                                    style={[
                                        tableStyles.bodyCell,
                                        s.colAmount,
                                        { fontWeight: "medium" },
                                    ]}>
                                    ${currencyFmt.format(adv.amount)}
                                </Text>
                                <Text
                                    style={[tableStyles.bodyCell, s.colDate]}>
                                    {formatDate(adv.repaymentDate)}
                                </Text>
                                <Text
                                    style={[
                                        tableStyles.bodyCell,
                                        s.colStatus,
                                    ]}>
                                    {adv.status}
                                </Text>
                            </View>
                        ))}

                        <View style={tableStyles.footerRow}>
                            <Text
                                style={[
                                    tableStyles.footerCell,
                                    s.colHash,
                                ]}
                            />
                            <Text
                                style={[
                                    tableStyles.footerCell,
                                    s.colAmount,
                                    { fontSize: 10 },
                                ]}>
                                ${currencyFmt.format(totalAmount)}
                            </Text>
                            <Text style={[tableStyles.footerCell, s.colDate]} />
                            <Text
                                style={[
                                    tableStyles.footerCell,
                                    s.colStatus,
                                    {
                                        fontSize: 7,
                                        fontWeight: "normal",
                                    },
                                ]}>
                                {paidCount} Paid / {outstandingCount}{" "}
                                Outstanding
                            </Text>
                        </View>
                    </View>

                    {/* Declaration */}
                    <View style={s.declaration}>
                        <Text style={s.declarationTitle}>
                            Employee Acknowledgment
                        </Text>
                        <Text style={s.declarationText}>
                            I acknowledge that this advance is a loan and will
                            be repaid according to the agreed terms. I authorize
                            the company to deduct the repayment from my salary
                            as specified.
                        </Text>
                    </View>

                    <SignatureSection
                        approvedLabel="Advance approved"
                        receivedLabel="Advance received"
                        approverName="Alvis Ong Thai Ying"
                        receiverName={request.workerName}
                        approvedDate={formatDate(
                            data.managerSignatureDate ?? request.requestDate,
                        )}
                        receivedDate={formatDate(
                            data.employeeSignatureDate ?? request.requestDate,
                        )}
                        approverSignatureDataUrl={data.managerSignature}
                        receiverSignatureDataUrl={data.employeeSignature}
                    />
                </DocumentShell>
            </Page>
        </Document>
    );
}
