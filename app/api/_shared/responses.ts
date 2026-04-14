type ApiSuccessBody<T> = {
    ok: true;
    data: T;
};

type ApiErrorBody = {
    ok: false;
    error: {
        code: string;
        message: string;
        details?: unknown;
    };
};

export function apiSuccess<T>(
    data: T,
    init?: number | ResponseInit,
): Response {
    const responseInit =
        typeof init === "number" ? { status: init } : (init ?? {});
    return Response.json({ ok: true, data } satisfies ApiSuccessBody<T>, responseInit);
}

export function apiError(input: {
    status: number;
    code: string;
    message: string;
    details?: unknown;
}): Response {
    return Response.json(
        {
            ok: false,
            error: {
                code: input.code,
                message: input.message,
                details: input.details,
            },
        } satisfies ApiErrorBody,
        { status: input.status },
    );
}
