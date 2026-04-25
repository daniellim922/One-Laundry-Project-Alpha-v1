import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
    const pdfBuffer = Buffer.from("test-pdf");

    const page = {
        goto: vi.fn().mockResolvedValue(undefined),
        emulateMedia: vi.fn().mockResolvedValue(undefined),
        evaluate: vi.fn().mockResolvedValue(undefined),
        pdf: vi.fn().mockResolvedValue(pdfBuffer),
        close: vi.fn().mockResolvedValue(undefined),
    };

    const context = {
        addCookies: vi.fn().mockResolvedValue(undefined),
        newPage: vi.fn().mockResolvedValue(page),
        close: vi.fn().mockResolvedValue(undefined),
    };

    const browser = {
        newContext: vi.fn().mockResolvedValue(context),
    };

    return {
        getBrowser: vi.fn().mockResolvedValue(browser),
        pdfBuffer,
        page,
        context,
        browser,
    };
});

vi.mock("./browser-manager", () => ({
    getBrowser: mocks.getBrowser,
}));

describe("generatePdf", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("returns a PDF buffer for a given URL", async () => {
        const { generatePdf } = await import("./generate-pdf");

        const result = await generatePdf({
            url: "http://localhost/dashboard/payroll/1/summary?print=1",
        });

        expect(result).toBeInstanceOf(Buffer);
        expect(result.toString()).toBe("test-pdf");
        expect(mocks.page.pdf).toHaveBeenCalledWith({
            format: "A4",
            printBackground: true,
            preferCSSPageSize: true,
            scale: 1,
            margin: { top: "10mm", right: "10mm", bottom: "10mm", left: "10mm" },
        });
        expect(mocks.page.close).toHaveBeenCalledTimes(1);
    });

    it("injects cookies into the browser context when a cookie header is provided", async () => {
        const { generatePdf } = await import("./generate-pdf");

        await generatePdf({
            url: "http://localhost/dashboard/payroll/1/summary?print=1",
            cookieHeader: "sb-access-token=abc123; sb-refresh-token=def456",
        });

        expect(mocks.context.addCookies).toHaveBeenCalledWith([
            {
                name: "sb-access-token",
                value: "abc123",
                domain: "localhost",
                path: "/",
            },
            {
                name: "sb-refresh-token",
                value: "def456",
                domain: "localhost",
                path: "/",
            },
        ]);
    });
});
