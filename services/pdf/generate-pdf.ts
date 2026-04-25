import { getBrowser } from "./browser-manager";

export interface GeneratePdfOptions {
    url: string;
    cookieHeader?: string;
}

export async function generatePdf(
    options: GeneratePdfOptions,
): Promise<Buffer> {
    const { url, cookieHeader } = options;

    const browser = await getBrowser();
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

        await page.goto(url, { waitUntil: "networkidle" });
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
            margin: { top: "10mm", right: "10mm", bottom: "10mm", left: "10mm" },
        });

        await page.close();

        return Buffer.from(pdf);
    } finally {
        await context.close();
    }
}

function parseCookieHeader(
    cookieHeader: string,
    url: string,
): Array<{ name: string; value: string; domain: string; path: string }> {
    const hostname = new URL(url).hostname;
    // Handle localhost and IP addresses; for proper domains, prepend a dot
    // so cookies match subdomains (e.g. vercel.app preview URLs).
    const domain = hostname.includes(":") || hostname === "localhost"
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
