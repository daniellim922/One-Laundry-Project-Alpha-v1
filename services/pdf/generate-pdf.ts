import { withBrowserRetry } from "./browser-manager";

export interface GeneratePdfOptions {
    url: string;
    cookieHeader?: string;
}

export class PdfGenerationError extends Error {
    constructor(
        public code: "AUTH_REQUIRED" | "PAGE_NOT_FOUND" | "TRANSIENT_ERROR" | "UNKNOWN",
        message: string,
    ) {
        super(message);
        this.name = "PdfGenerationError";
    }
}

export async function generatePdf(
    options: GeneratePdfOptions,
): Promise<Buffer> {
    try {
        return await withBrowserRetry(async (browser) => {
            const { url, cookieHeader } = options;

            const context = await browser.newContext({
                viewport: { width: 1240, height: 1754 },
            });

            try {
                if (cookieHeader) {
                    const cookies = parseCookieHeader(cookieHeader, url);
                    if (cookies.length > 0) {
                        await context.addCookies(cookies);
                    }
                }

                const page = await context.newPage();

                const response = await page.goto(url, {
                    waitUntil: "networkidle",
                });

                const finalUrl = page.url();
                if (finalUrl.includes("/login")) {
                    throw new PdfGenerationError(
                        "AUTH_REQUIRED",
                        "Authentication failed — the PDF page requires a valid session",
                    );
                }

                if (response && response.status() === 404) {
                    throw new PdfGenerationError(
                        "PAGE_NOT_FOUND",
                        "PDF page not found",
                    );
                }

                await page.emulateMedia({ media: "print" });
                await page.evaluate(async () => {
                    // Ensure web fonts are ready so spacing/weights match UI.
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const fonts = (document as any).fonts;
                    if (fonts?.ready) await fonts.ready;
                });

                const pdf = await page.pdf({
                    format: "A4",
                    printBackground: true,
                    preferCSSPageSize: true,
                    scale: 1,
                    margin: {
                        top: "10mm",
                        right: "10mm",
                        bottom: "10mm",
                        left: "10mm",
                    },
                });

                await page.close();

                return Buffer.from(pdf);
            } finally {
                await context.close();
            }
        });
    } catch (error) {
        if (error instanceof PdfGenerationError) {
            throw error;
        }
        throw new PdfGenerationError(
            "TRANSIENT_ERROR",
            `PDF generation failed due to a temporary browser error: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
    }
}

function parseCookieHeader(
    cookieHeader: string,
    url: string,
): Array<{ name: string; value: string; domain: string; path: string }> {
    const hostname = new URL(url).hostname;
    // Handle localhost and IP addresses; for proper domains, prepend a dot
    // so cookies match subdomains (e.g. vercel.app preview URLs).
    const domain =
        hostname.includes(":") || hostname === "localhost"
            ? hostname
            : `.${hostname}`;

    return cookieHeader
        .split(";")
        .map((part) => part.trim())
        .filter(Boolean)
        .map((pair) => {
            const eqIdx = pair.indexOf("=");
            if (eqIdx === -1) {
                return { name: pair, value: "", domain, path: "/" };
            }
            return {
                name: pair.slice(0, eqIdx).trim(),
                value: pair.slice(eqIdx + 1).trim(),
                domain,
                path: "/",
            };
        });
}
