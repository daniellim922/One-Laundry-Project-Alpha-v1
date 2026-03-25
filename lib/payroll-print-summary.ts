/**
 * Opens the browser print dialog for the payroll summary / voucher view.
 * Matches title behavior used on the payment voucher screen.
 */
export function printPayrollSummary(opts: {
    workerName: string;
    periodStart: string;
    periodEnd: string;
}): void {
    const { workerName, periodStart, periodEnd } = opts;
    const periodStartDate = new Date(periodStart + "T00:00:00");
    const periodEndDate = new Date(periodEnd + "T00:00:00");
    const periodStartForTitle = periodStartDate.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    });
    const periodEndForTitle = periodEndDate.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    });

    const originalTitle = document.title;
    const safeName = workerName.replace(/[/\\:*?"<>|]/g, "-");
    const customTitle = `${safeName} - ${periodStartForTitle}-${periodEndForTitle}`;

    const beforePrint = () => {
        document.title = customTitle;
    };
    const afterPrint = () => {
        document.title = originalTitle;
        window.removeEventListener("beforeprint", beforePrint);
        window.removeEventListener("afterprint", afterPrint);
    };

    window.addEventListener("beforeprint", beforePrint);
    window.addEventListener("afterprint", afterPrint);
    document.title = customTitle;
    requestAnimationFrame(() => {
        setTimeout(() => window.print(), 100);
    });
}
