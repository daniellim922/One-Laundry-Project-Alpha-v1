import { revalidateTransportPaths } from "@/app/api/_shared/revalidate";
import { apiError } from "@/app/api/_shared/responses";

type PayrollTransitionFailure = {
    success: false;
    code: string;
    error: string;
};

export function payrollTransitionFailureResponse(
    result: PayrollTransitionFailure,
): Response {
    return apiError({
        status:
            result.code === "NOT_FOUND"
                ? 404
                : result.code === "INVALID_STATE"
                  ? 409
                  : 500,
        code: result.code,
        message: result.error,
    });
}

/** Revalidate payroll-related UI after revert or settle. */
export function revalidateAfterPayrollMutation(
    payrollId: string,
    options?: { includeDashboardRoot?: boolean },
) {
    const paths: string[] = [
        `/dashboard/payroll/${payrollId}/breakdown`,
        `/dashboard/payroll/${payrollId}/summary`,
    ];
    if (options?.includeDashboardRoot) {
        paths.push("/dashboard");
    }
    paths.push(
        "/dashboard/payroll",
        "/dashboard/payroll/all",
        "/dashboard/advance",
        "/dashboard/advance/all",
        "/dashboard/timesheet",
        "/dashboard/timesheet/all",
    );
    revalidateTransportPaths(paths);
}
