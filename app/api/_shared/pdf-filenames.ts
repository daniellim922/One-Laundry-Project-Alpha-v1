export { isoDate, isoToDdmmyyyy, safeFilenamePart } from "@/lib/pdf-filename-parts";

export function pdfAttachmentResponse(pdf: Buffer, filename: string): Response {
    return new Response(new Uint8Array(pdf), {
        headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="${filename}"`,
            "Cache-Control": "no-store",
        },
    });
}
