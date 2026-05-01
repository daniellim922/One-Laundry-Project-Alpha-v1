import { NextRequest } from "next/server";

import { requireCurrentApiUser } from "@/app/api/_shared/auth";
import {
    pdfAttachmentResponse,
    safeFilenamePart,
} from "@/app/api/_shared/pdf-filenames";
import { getRequestOrigin } from "@/app/api/_shared/origin";
import { generatePdf } from "@/services/pdf/generate-pdf";

export async function handlePdfExport<TMeta>(
    req: NextRequest,
    ctx: { params: Promise<{ id: string }> },
    options: {
        buildPrintUrl: (origin: string, id: string) => string;
        fetchMeta: (id: string) => Promise<TMeta>;
        buildFilename: (id: string, meta: TMeta) => string;
    },
): Promise<Response> {
    const auth = await requireCurrentApiUser();
    if (auth instanceof Response) {
        return auth;
    }

    const { id } = await ctx.params;
    const origin = getRequestOrigin(req);
    const url = options.buildPrintUrl(origin, id);

    const meta = await options.fetchMeta(id);

    const pdf = await generatePdf({
        url,
        cookieHeader: req.headers.get("cookie") ?? undefined,
    });

    const filename = safeFilenamePart(options.buildFilename(id, meta));
    return pdfAttachmentResponse(pdf, filename);
}
