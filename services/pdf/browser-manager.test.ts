import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
    const browsers: { close: ReturnType<typeof vi.fn> }[] = [];

    const launch = vi.fn().mockImplementation(() => {
        const browser = { close: vi.fn().mockResolvedValue(undefined) };
        browsers.push(browser);
        return Promise.resolve(browser);
    });

    return {
        chromiumArgs: ["--no-sandbox", "--disable-dev-shm-usage"],
        chromiumHeadless: "shell",
        chromiumExecutablePath: vi.fn().mockResolvedValue("/path/to/chromium"),
        launch,
        browsers,
    };
});

vi.mock("@sparticuz/chromium", () => ({
    default: {
        args: mocks.chromiumArgs,
        headless: mocks.chromiumHeadless,
        executablePath: mocks.chromiumExecutablePath,
    },
}));

vi.mock("playwright-core", () => ({
    chromium: {
        launch: mocks.launch,
    },
}));

describe("browser-manager", () => {
    beforeEach(async () => {
        vi.clearAllMocks();
        mocks.browsers.length = 0;
        vi.resetModules();
    });

    it("returns the same browser promise on consecutive calls", async () => {
        const { getBrowser } = await import("./browser-manager");

        const promise1 = getBrowser();
        const promise2 = getBrowser();

        expect(promise1).toBe(promise2);

        const browser = await promise1;
        expect(browser).toBe(await promise2);
        expect(mocks.launch).toHaveBeenCalledTimes(1);
    });

    it("closes the browser and creates a new instance after closeBrowser", async () => {
        const { getBrowser, closeBrowser } = await import(
            "./browser-manager"
        );

        const browser1 = await getBrowser();
        await closeBrowser();

        expect(browser1.close).toHaveBeenCalledTimes(1);

        const browser2 = await getBrowser();
        expect(mocks.launch).toHaveBeenCalledTimes(2);
        expect(browser2).not.toBe(browser1);
    });
});

describe("withBrowserRetry", () => {
    beforeEach(async () => {
        vi.clearAllMocks();
        mocks.browsers.length = 0;
        vi.resetModules();
    });

    it("retries once after a transient browser-closed error and succeeds", async () => {
        const { withBrowserRetry } = await import("./browser-manager");

        let attempt = 0;
        const operation = vi.fn().mockImplementation(async () => {
            attempt++;
            if (attempt === 1) {
                throw new Error("browser has been closed");
            }
            return "success";
        });

        const result = await withBrowserRetry(operation);

        expect(result).toBe("success");
        expect(operation).toHaveBeenCalledTimes(2);
        expect(mocks.launch).toHaveBeenCalledTimes(2);
    });

    it("retries once after ERR_INSUFFICIENT_RESOURCES and succeeds", async () => {
        const { withBrowserRetry } = await import("./browser-manager");

        let attempt = 0;
        const operation = vi.fn().mockImplementation(async () => {
            attempt++;
            if (attempt === 1) {
                const err = new Error("Operation failed");
                (err as Error & { code: string }).code =
                    "ERR_INSUFFICIENT_RESOURCES";
                throw err;
            }
            return "success";
        });

        const result = await withBrowserRetry(operation);

        expect(result).toBe("success");
        expect(operation).toHaveBeenCalledTimes(2);
    });

    it("does not retry permanent errors", async () => {
        const { withBrowserRetry } = await import("./browser-manager");

        const operation = vi.fn().mockRejectedValue(
            new Error("Navigation failed: net::ERR_ABORTED"),
        );

        await expect(withBrowserRetry(operation)).rejects.toThrow(
            "Navigation failed: net::ERR_ABORTED",
        );
        expect(operation).toHaveBeenCalledTimes(1);
        expect(mocks.launch).toHaveBeenCalledTimes(1);
    });

    it("throws the final error when the retry also fails", async () => {
        const { withBrowserRetry } = await import("./browser-manager");

        const operation = vi.fn().mockRejectedValue(
            new Error("browser has been closed"),
        );

        await expect(withBrowserRetry(operation)).rejects.toThrow(
            "browser has been closed",
        );
        expect(operation).toHaveBeenCalledTimes(2);
        expect(mocks.launch).toHaveBeenCalledTimes(2);
    });
});
