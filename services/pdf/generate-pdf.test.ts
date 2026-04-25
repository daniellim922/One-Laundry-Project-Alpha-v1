import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
    const pdfBuffer = Buffer.from("test-pdf");

    const page = {
        goto: vi.fn().mockResolvedValue({ status: () => 200 }),
        url: vi.fn().mockReturnValue("http://localhost/dashboard/payroll/1/summary"),
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
        closeBrowser: vi.fn().mockResolvedValue(undefined),
        withBrowserRetry: vi.fn().mockImplementation(
            async <T>(operation: (browser: unknown) => Promise<T>) => {
                return operation(mocks.browser);
            },
        ),
        pdfBuffer,
        page,
        context,
        browser,
    };
});

vi.mock("./browser-manager", () => ({
    getBrowser: mocks.getBrowser,
    closeBrowser: mocks.closeBrowser,
    withBrowserRetry: mocks.withBrowserRetry,
}));

describe("generatePdf", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.page.goto.mockResolvedValue({ status: () => 200 });
        mocks.page.url.mockReturnValue(
            "http://localhost/dashboard/payroll/1/summary",
        );
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

    it("throws an auth error when navigation lands on the login page", async () => {
        const { generatePdf, PdfGenerationError } = await import(
            "./generate-pdf"
        );

        mocks.page.url.mockReturnValue("http://localhost/login");

        await expect(
            generatePdf({
                url: "http://localhost/dashboard/payroll/1/summary?print=1",
            }),
        ).rejects.toSatisfy((err: unknown) => {
            return (
                err instanceof PdfGenerationError &&
                err.code === "AUTH_REQUIRED"
            );
        });
    });

    it("throws a not-found error when the page returns 404", async () => {
        const { generatePdf, PdfGenerationError } = await import(
            "./generate-pdf"
        );

        mocks.page.goto.mockResolvedValue({ status: () => 404 });

        await expect(
            generatePdf({
                url: "http://localhost/dashboard/payroll/1/summary?print=1",
            }),
        ).rejects.toSatisfy((err: unknown) => {
            return (
                err instanceof PdfGenerationError &&
                err.code === "PAGE_NOT_FOUND"
            );
        });
    });

    it("wraps persistent transient errors with a clear message", async () => {
        const { generatePdf, PdfGenerationError } = await import(
            "./generate-pdf"
        );

        mocks.withBrowserRetry.mockImplementationOnce(async () => {
            throw new Error("browser has been closed");
        });

        await expect(
            generatePdf({
                url: "http://localhost/dashboard/payroll/1/summary?print=1",
            }),
        ).rejects.toSatisfy((err: unknown) => {
            return (
                err instanceof PdfGenerationError &&
                err.code === "TRANSIENT_ERROR"
            );
        });
    });
});
