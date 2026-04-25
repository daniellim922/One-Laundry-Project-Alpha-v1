import chromium from "@sparticuz/chromium";
import { chromium as playwrightChromium, Browser } from "playwright-core";

let browserPromise: Promise<Browser> | null = null;

export function getBrowser(): Promise<Browser> {
    if (!browserPromise) {
        browserPromise = (async () => {
            return playwrightChromium.launch({
                args: [
                    ...chromium.args,
                    "--disable-dev-shm-usage",
                    "--disable-gpu",
                    "--single-process",
                ],
                executablePath: await chromium.executablePath(),
                headless: true,
            });
        })();
    }
    return browserPromise;
}

export async function closeBrowser(): Promise<void> {
    if (browserPromise) {
        const browser = await browserPromise;
        await browser.close();
        browserPromise = null;
    }
}
