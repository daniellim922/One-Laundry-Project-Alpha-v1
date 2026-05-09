import { expect, type Page } from "@playwright/test";

export async function gotoAdvanceOverview(page: Page): Promise<void> {
    await page.goto("/dashboard/advance");
    await page.getByRole("heading", { name: "Advance" }).waitFor();
}

/** Advance request form signature pads (`react-signature-canvas`). */
export async function drawSignatureStroke(page: Page, ariaLabel: string): Promise<void> {
    const canvas = page.locator(`canvas[aria-label="${ariaLabel}"]`);
    await canvas.scrollIntoViewIfNeeded();
    await canvas.waitFor({ state: "visible", timeout: 30_000 });
    await expect
        .poll(
            async () => {
                const b = await canvas.boundingBox();
                return b != null && b.width >= 40 && b.height >= 40;
            },
            { timeout: 15_000 },
        )
        .toBeTruthy();

    const box = await canvas.boundingBox();
    expect(box).toBeTruthy();
    const startX = box!.x + Math.min(24, box!.width * 0.15);
    const startY = box!.y + Math.min(48, box!.height * 0.35);
    const endX = box!.x + box!.width * 0.88;
    const endY = box!.y + box!.height * 0.58;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(endX, endY, { steps: 12 });
    await page.mouse.up();
}
