"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { printPayrollSummary } from "@/lib/payroll-print-summary";

type Props = {
    workerName: string;
    periodStart: string;
    periodEnd: string;
};

export function PayrollSummaryPrintTrigger({
    workerName,
    periodStart,
    periodEnd,
}: Props) {
    const searchParams = useSearchParams();
    const router = useRouter();

    React.useEffect(() => {
        if (searchParams.get("print") !== "1") return;

        printPayrollSummary({ workerName, periodStart, periodEnd });

        const path = window.location.pathname;
        const next = new URLSearchParams(searchParams.toString());
        next.delete("print");
        const qs = next.toString();
        router.replace(qs ? `${path}?${qs}` : path, { scroll: false });
    }, [searchParams, router, workerName, periodStart, periodEnd]);

    return null;
}
