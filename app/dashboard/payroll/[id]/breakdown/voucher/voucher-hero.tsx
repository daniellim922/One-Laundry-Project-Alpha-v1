import type { SelectPayrollVoucher } from "@/db/tables/payrollVoucherTable";
import { formatMoney } from "./format-money";

type Props = {
    voucher: Pick<SelectPayrollVoucher, "netPay" | "totalPay" | "cpf" | "advance">;
};

export function VoucherHero({ voucher }: Props) {
    return (
        <div className="rounded-lg bg-muted/30 p-5">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:items-end">
                <div className="md:col-span-1">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        Net Pay
                    </p>
                    <p className="mt-1 text-4xl font-semibold tabular-nums">
                        {formatMoney(voucher.netPay)}
                    </p>
                </div>
                <HeroSecondary label="Total Pay" value={voucher.totalPay} />
                <HeroSecondary label="CPF" value={voucher.cpf} />
                <HeroSecondary label="Advance" value={voucher.advance} />
            </div>
        </div>
    );
}

function HeroSecondary({
    label,
    value,
}: {
    label: string;
    value: number | null;
}) {
    return (
        <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
                {label}
            </p>
            <p className="mt-1 text-lg font-medium tabular-nums">
                {formatMoney(value)}
            </p>
        </div>
    );
}
