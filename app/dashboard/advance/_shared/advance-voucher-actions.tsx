import { generateAndUploadAdvancePdf } from "@/lib/client/generate-and-upload-pdf";

const ADVANCE_PDF_TIMEOUT_MS = 60_000;

/** Best-effort PDF generation after create; record is already persisted. */
export async function generateAdvancePdfAfterCreate(
    advanceRequestId: string,
): Promise<void> {
    try {
        const timeout = new Promise<never>((_, reject) => {
            setTimeout(
                () => reject(new Error("ADVANCE_PDF_TIMEOUT")),
                ADVANCE_PDF_TIMEOUT_MS,
            );
        });
        await Promise.race([
            generateAndUploadAdvancePdf(advanceRequestId),
            timeout,
        ]);
    } catch (e) {
        if (e instanceof Error && e.message === "ADVANCE_PDF_TIMEOUT") {
            console.warn(
                "[advance] PDF upload timed out; continuing to list (record already saved)",
            );
        }
    }
}
