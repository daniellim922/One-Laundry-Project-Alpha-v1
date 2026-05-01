import type { z } from "zod";

import { requireCurrentApiUser } from "@/app/api/_shared/auth";
import { apiError, apiSuccess } from "@/app/api/_shared/responses";
import { revalidateTransportPaths } from "@/app/api/_shared/revalidate";

type VoucherMutationFailure = {
    success: false;
    code: string;
    error: string;
};

export function voucherMutationFailureResponse(result: VoucherMutationFailure): Response {
    return apiError({
        status:
            result.code === "VALIDATION_ERROR"
                ? 400
                : result.code === "NOT_FOUND"
                  ? 404
                  : result.code === "CONFLICT"
                    ? 409
                    : 500,
        code: result.code,
        message: result.error,
    });
}

export async function handlePayrollVoucherJsonPatch<
    TSchema extends z.ZodType,
    TResult extends { success: boolean },
>(
    request: Request,
    context: { params: Promise<{ id: string }> },
    options: {
        schema: TSchema;
        validationMessage: string;
        execute: (
            args: { payrollId: string } & z.infer<TSchema>,
        ) => Promise<TResult>;
        logLabel: string;
    },
): Promise<Response> {
    const auth = await requireCurrentApiUser();
    if (auth instanceof Response) {
        return auth;
    }

    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return apiError({
            status: 400,
            code: "INVALID_JSON",
            message: "Invalid JSON",
        });
    }

    const parsedBody = options.schema.safeParse(body);
    if (!parsedBody.success) {
        return apiError({
            status: 400,
            code: "VALIDATION_ERROR",
            message: options.validationMessage,
            details: parsedBody.error.flatten(),
        });
    }

    const { id } = await context.params;
    const dto = parsedBody.data as z.infer<TSchema>;
    const args = Object.assign({}, dto as object, {
        payrollId: id,
    }) as { payrollId: string } & z.infer<TSchema>;
    const result = await options.execute(args);

    if (!result.success) {
        return voucherMutationFailureResponse(
            result as unknown as VoucherMutationFailure,
        );
    }

    try {
        revalidateTransportPaths([
            `/dashboard/payroll/${id}/breakdown`,
            `/dashboard/payroll/${id}/summary`,
            "/dashboard/payroll",
            "/dashboard/payroll/all",
        ]);
    } catch (e) {
        console.error(`revalidateTransportPaths after ${options.logLabel}`, e);
    }

    return apiSuccess(result);
}
