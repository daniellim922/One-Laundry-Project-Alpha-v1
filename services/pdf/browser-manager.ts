import chromium from "@sparticuz/chromium";
import { chromium as playwrightChromium, Browser } from "playwright-core";

let browserPromise: Promise<Browser> | null = null;

const isDev = process.env.NODE_ENV === "development";

export function getBrowser(): Promise<Browser> {
    if (!browserPromise) {
        browserPromise = (async () => {
            const executablePath = isDev
                ? undefined
                : await chromium.executablePath();

            return playwrightChromium.launch({
                args: isDev
                    ? ["--disable-dev-shm-usage", "--disable-gpu"]
                    : [
                          ...chromium.args,
                          "--disable-dev-shm-usage",
                          "--disable-gpu",
                          "--single-process",
                      ],
                executablePath,
                headless: true,
            });
        })();
    }
    return browserPromise;
}

export async function closeBrowser(): Promise<void> {
    if (browserPromise) {
        try {
            const browser = await browserPromise;
            await browser.close();
        } catch {
            // Swallow errors from a dead browser process.
        }
        browserPromise = null;
    }
}

function isTransientError(error: unknown): boolean {
    if (!(error instanceof Error)) return false;
    const message = error.message.toLowerCase();
    const code = (error as Error & { code?: string }).code;

    if (code === "ERR_INSUFFICIENT_RESOURCES") return true;
    if (message.includes("browser has been closed")) return true;
    if (message.includes("target closed")) return true;
    if (message.includes("err_insufficient_resources")) return true;
    if (message.includes("timeout")) return true;

    return false;
}

export async function withBrowserRetry<T>(
    operation: (browser: Browser) => Promise<T>,
): Promise<T> {
    try {
        const browser = await getBrowser();
        return await operation(browser);
    } catch (error) {
        if (isTransientError(error)) {
            await closeBrowser();
            const browser = await getBrowser();
            return await operation(browser);
        }
        throw error;
    }
}
