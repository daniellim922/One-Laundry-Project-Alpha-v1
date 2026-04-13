import { NextRequest } from "next/server";

import { requireApiPermission } from "@/app/api/_shared/auth";
import { revalidateTransportPaths } from "@/app/api/_shared/revalidate";
import { apiError, apiSuccess } from "@/app/api/_shared/responses";
import { updateUserBanStatus } from "@/services/iam/update-user-ban-status";

const IAM_FEATURE = "IAM (Identity and Access Management)";

type Body = {
    banned?: unknown;
    reason?: unknown;
};

type ParsedStatusBody =
    | {
          banned: boolean;
          reason?: string;
      }
    | {
          error: string;
      };

function parseStatusBody(body: Body): ParsedStatusBody {
    if (typeof body.banned !== "boolean") {
        return {
            error: "The 'banned' field must be a boolean.",
        };
    }

    if (body.reason != null && typeof body.reason !== "string") {
        return {
            error: "The 'reason' field must be a string when provided.",
        };
    }

    return {
        banned: body.banned,
        reason: typeof body.reason === "string" ? body.reason : undefined,
    };
}

export async function PATCH(
    req: NextRequest,
    ctx: { params: Promise<{ id: string }> },
) {
    const permission = await requireApiPermission(req, IAM_FEATURE, "update");
    if (permission instanceof Response) {
        return permission;
    }

    let body: Body;
    try {
        body = (await req.json()) as Body;
    } catch {
        return apiError({
            status: 400,
            code: "INVALID_JSON",
            message: "Invalid JSON",
        });
    }

    const parsedBody = parseStatusBody(body);
    if ("error" in parsedBody) {
        return apiError({
            status: 400,
            code: "VALIDATION_ERROR",
            message: parsedBody.error,
        });
    }

    const { id } = await ctx.params;
    const result = await updateUserBanStatus({
        userId: id,
        banned: parsedBody.banned,
        reason: parsedBody.reason,
    });

    if (!result.success) {
        return apiError({
            status:
                result.code === "NOT_FOUND"
                    ? 404
                    : result.code === "CONFLICT"
                      ? 409
                      : 400,
            code: result.code,
            message: result.error,
        });
    }

    revalidateTransportPaths(["/dashboard/iam", "/dashboard/iam/roles"]);

    return apiSuccess({
        userId: result.userId,
        banned: result.banned,
    });
}
