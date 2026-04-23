import type { SelectPayrollVoucher } from "@/db/tables/payrollVoucherTable";

type Props = {
    voucher: Pick<
        SelectPayrollVoucher,
        | "employmentType"
        | "employmentArrangement"
        | "paymentMethod"
        | "payNowPhone"
        | "bankAccountNumber"
    >;
};

export function VoucherSummaryRow({ voucher }: Props) {
    const paymentDetail =
        voucher.paymentMethod === "PayNow"
            ? voucher.payNowPhone
            : voucher.paymentMethod === "Bank Transfer"
              ? voucher.bankAccountNumber
              : null;

    const parts = [
        voucher.employmentType,
        voucher.employmentArrangement,
        voucher.paymentMethod
            ? paymentDetail
                ? `${voucher.paymentMethod} ${paymentDetail}`
                : voucher.paymentMethod
            : null,
    ].filter(Boolean);

    if (parts.length === 0) return null;

    return (
        <p className="text-sm text-muted-foreground">
            {parts.join(" · ")}
        </p>
    );
}
