"use no memo";

import { Document, Page, StyleSheet } from "@react-pdf/renderer";

import {
    PayrollVoucherPage,
    type PayrollVoucherData,
} from "./payroll-voucher-document";
import { TimesheetPage, type TimesheetData } from "./timesheet-document";

export type PayrollPdfData = {
    voucher: PayrollVoucherData;
    timesheet: TimesheetData;
};

const pageStyles = StyleSheet.create({
    page: {
        paddingHorizontal: 40,
        paddingVertical: 30,
        fontFamily: "Helvetica",
        fontSize: 9,
    },
});

export function PayrollPdfDocument({ data }: { data: PayrollPdfData }) {
    return (
        <Document>
            <Page size="A4" style={pageStyles.page}>
                <PayrollVoucherPage data={data.voucher} />
            </Page>
            <Page size="A4" style={pageStyles.page}>
                <TimesheetPage data={data.timesheet} />
            </Page>
        </Document>
    );
}
