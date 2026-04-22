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

export function FullTimeMonthlyPayCard({
    totalMonthlyPay,
}: {
    /** Sum of contracted monthly pay for active Foreign Full Time workers. */
    totalMonthlyPay: number;
}) {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                    Full Time monthly pay
                </CardTitle>
                <Wallet className="text-muted-foreground size-4" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold tabular-nums">
                    ${formatMoney(totalMonthlyPay)}
                </div>
                <p className="text-muted-foreground text-xs">
                    Foreign Full Time — total contracted monthly pay
                </p>
            </CardContent>
        </Card>
    );
}
