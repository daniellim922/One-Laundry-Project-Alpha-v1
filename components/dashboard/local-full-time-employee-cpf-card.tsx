import { Wallet } from "lucide-react";

import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";

const currencyFmt = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

function formatMoney(value: number): string {
    return currencyFmt.format(value);
}

export function LocalFullTimeEmployeeCpfCard({
    totalEmployeeCpf,
}: {
    /** Sum of employee CPF on employment for active Local Full Time workers. */
    totalEmployeeCpf: number;
}) {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                    Local Full Time employee CPF
                </CardTitle>
                <Wallet className="text-muted-foreground size-4" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold tabular-nums">
                    ${formatMoney(totalEmployeeCpf)}
                </div>
                <p className="text-muted-foreground text-xs">
                    Local Full Time — total employee CPF on employment
                </p>
            </CardContent>
        </Card>
    );
}
