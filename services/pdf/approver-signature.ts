import "server-only";
import fs from "node:fs";
import path from "node:path";

const BUNDLED_SIGNATURE_FILENAME = "alvis-ong-thai-ying.png";

const MIME_BY_EXT: Record<string, string> = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
};

/**
 * Reads the bundled approver signature from `public/signatures/` and returns a
 * data URL suitable for PDF and printable HTML vouchers.
 */
export function getBundledApproverSignatureDataUrl(): string {
    const filePath = path.join(
        process.cwd(),
        "public",
        "signatures",
        BUNDLED_SIGNATURE_FILENAME,
    );
    const buf = fs.readFileSync(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const mime = MIME_BY_EXT[ext] ?? "image/png";
    return `data:${mime};base64,${buf.toString("base64")}`;
}
