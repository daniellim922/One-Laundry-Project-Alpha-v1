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
