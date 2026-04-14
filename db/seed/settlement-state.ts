import type {
    AdvanceLoanStatus,
    InstallmentStatus,
    PayrollStatus,
    TimesheetPaymentStatus,
} from "@/types/status";

type SeedPeriodLike = {
    year: number;
};

export function getSeedPayrollStatus(period: SeedPeriodLike): PayrollStatus {
    return period.year === 2025 ? "Settled" : "Draft";
}

export function getSeedTimesheetStatus(
    period: SeedPeriodLike,
): TimesheetPaymentStatus {
    return getSeedPayrollStatus(period) === "Settled"
        ? "Timesheet Paid"
        : "Timesheet Unpaid";
}

export function getSeedInstallmentStatus(
    period: SeedPeriodLike,
): InstallmentStatus {
    return getSeedPayrollStatus(period) === "Settled"
        ? "Installment Paid"
        : "Installment Loan";
}

export function getSeedAdvanceRequestStatus(
    installmentStatuses: InstallmentStatus[],
): AdvanceLoanStatus {
    return installmentStatuses.every((status) => status === "Installment Paid")
        ? "Advance Paid"
        : "Advance Loan";
}
