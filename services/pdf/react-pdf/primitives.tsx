"use no memo";

import { View, Text, Image, StyleSheet } from "@react-pdf/renderer";
import type { ReactNode } from "react";

type Style = ReturnType<typeof StyleSheet.create>[string];

const baseStyles = StyleSheet.create({
    shell: {
        border: "1pt solid #000",
        backgroundColor: "#fff",
        color: "#000",
    },
    titleBar: {
        borderBottom: "1pt solid #000",
        paddingHorizontal: 32,
        paddingTop: 24,
        paddingBottom: 16,
    },
    titleText: {
        textAlign: "center",
        fontSize: 14,
        fontWeight: "bold",
        letterSpacing: 3,
    },
    content: {
        padding: 32,
        gap: 20,
    },
});

export function DocumentShell({
    title,
    children,
    style,
}: {
    title: string;
    children: ReactNode;
    style?: Style;
}) {
    return (
        <View style={style ? [baseStyles.shell, style] : baseStyles.shell}>
            <View style={baseStyles.titleBar}>
                <Text style={baseStyles.titleText}>{title}</Text>
            </View>
            <View style={baseStyles.content}>{children}</View>
        </View>
    );
}

// ── Metadata table (2×2 label–value grid) ──

export type MetadataRow = {
    leftLabel: string;
    leftValue: string;
    rightLabel: string;
    rightValue: string;
};

const metaStyles = StyleSheet.create({
    row: {
        flexDirection: "row",
        paddingVertical: 3,
    },
    label: {
        width: "22%",
        textAlign: "right",
        fontSize: 9,
        fontWeight: "medium",
        paddingRight: 4,
    },
    value: {
        width: "28%",
        fontSize: 9,
        fontWeight: "bold",
    },
    valueUppercase: {
        width: "28%",
        fontSize: 9,
        fontWeight: "bold",
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
});

export function MetadataTable({
    rows,
    uppercaseLeftValue = false,
}: {
    rows: MetadataRow[];
    uppercaseLeftValue?: boolean;
}) {
    return (
        <View>
            {rows.map((row, i) => (
                <View key={i} style={metaStyles.row}>
                    <Text style={metaStyles.label}>{row.leftLabel}</Text>
                    <Text
                        style={
                            uppercaseLeftValue
                                ? metaStyles.valueUppercase
                                : metaStyles.value
                        }>
                        {row.leftValue}
                    </Text>
                    <Text style={metaStyles.label}>{row.rightLabel}</Text>
                    <Text style={metaStyles.value}>{row.rightValue}</Text>
                </View>
            ))}
        </View>
    );
}

// ── Signature section ──

const sigStyles = StyleSheet.create({
    container: {
        marginTop: 20,
    },
    nameRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 4,
    },
    nameText: {
        fontSize: 9,
        fontWeight: "medium",
    },
    signatureAreaRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: 8,
    },
    sigBlock: {
        width: 180,
    },
    sigImageSlot: {
        height: 44,
        width: 180,
        justifyContent: "flex-end",
    },
    signatureImage: {
        width: 120,
        height: 40,
        objectFit: "contain",
    },
    signatureLine: {
        width: 180,
        borderBottom: "1pt solid #000",
        marginTop: 4,
    },
    dateRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: 8,
    },
    dateText: {
        fontSize: 9,
    },
    datePlaceholder: {
        display: "flex",
        flexDirection: "row",
        fontSize: 9,
    },
    dateUnderline: {
        width: 100,
        borderBottom: "0.5pt solid #999",
        marginLeft: 2,
    },
});

export function SignatureSection({
    approvedLabel,
    receivedLabel,
    approverName,
    receiverName,
    approvedDate,
    receivedDate,
    approverSignatureDataUrl,
    receiverSignatureDataUrl,
}: {
    approvedLabel: string;
    receivedLabel: string;
    approverName: string;
    receiverName: string;
    approvedDate?: string;
    receivedDate?: string;
    approverSignatureDataUrl?: string | null;
    receiverSignatureDataUrl?: string | null;
}) {
    return (
        <View style={sigStyles.container}>
            <View style={sigStyles.nameRow}>
                <Text style={sigStyles.nameText}>
                    {approvedLabel} by {approverName}
                </Text>
                <Text style={sigStyles.nameText}>
                    {receivedLabel} by {receiverName}
                </Text>
            </View>

            <View style={sigStyles.signatureAreaRow}>
                <View style={sigStyles.sigBlock}>
                    <View style={sigStyles.sigImageSlot}>
                        {approverSignatureDataUrl ? (
                            <Image
                                src={approverSignatureDataUrl}
                                style={sigStyles.signatureImage}
                            />
                        ) : null}
                    </View>
                    <View style={sigStyles.signatureLine} />
                </View>
                <View style={sigStyles.sigBlock}>
                    <View style={sigStyles.sigImageSlot}>
                        {receiverSignatureDataUrl ? (
                            <Image
                                src={receiverSignatureDataUrl}
                                style={sigStyles.signatureImage}
                            />
                        ) : null}
                    </View>
                    <View style={sigStyles.signatureLine} />
                </View>
            </View>

            <View style={sigStyles.dateRow}>
                <View style={sigStyles.datePlaceholder}>
                    <Text>Date: </Text>
                    {approvedDate ? (
                        <Text>{approvedDate}</Text>
                    ) : (
                        <View style={sigStyles.dateUnderline} />
                    )}
                </View>
                <View style={sigStyles.datePlaceholder}>
                    <Text>Date: </Text>
                    {receivedDate ? (
                        <Text>{receivedDate}</Text>
                    ) : (
                        <View style={sigStyles.dateUnderline} />
                    )}
                </View>
            </View>
        </View>
    );
}

// ── Generic table primitives ──

const tableStyles = StyleSheet.create({
    headerRow: {
        flexDirection: "row",
        borderTop: "2pt solid #000",
        borderBottom: "2pt solid #000",
        paddingVertical: 5,
    },
    bodyRow: {
        flexDirection: "row",
        borderBottom: "0.5pt solid #ccc",
        paddingVertical: 4,
    },
    footerRow: {
        flexDirection: "row",
        borderTop: "2pt solid #000",
        paddingVertical: 6,
    },
    headerCell: {
        fontSize: 8,
        fontWeight: "bold",
    },
    bodyCell: {
        fontSize: 8,
    },
    footerCell: {
        fontSize: 9,
        fontWeight: "bold",
    },
});

export { tableStyles };
