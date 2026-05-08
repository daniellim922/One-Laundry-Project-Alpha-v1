import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

/** Captured PNGs from `screenshot()`; gitignored by default. */
export const SCREENSHOTS_DIR = path.join(process.cwd(), "test/e2e/screenshots");

/** WebM recordings from `recordStart()`; gitignored by default. */
export const VIDEOS_DIR = path.join(process.cwd(), "test/e2e/videos");

/** macOS/other transient IPC failures talking to the agent-browser daemon. */
const TRANSIENT_DAEMON_MARKERS = [
    "Resource temporarily unavailable",
    "os error 35",
    "daemon may be busy",
    "unresponsive",
] as const;

function syncSleepMs(ms: number): void {
    if (ms <= 0) {
        return;
    }
    const sab = new SharedArrayBuffer(4);
    const ia = new Int32Array(sab);
    Atomics.wait(ia, 0, 0, ms);
}

function isTransientDaemonMessage(message: string): boolean {
    return TRANSIENT_DAEMON_MARKERS.some((m) => message.includes(m));
}

function cmdTimeoutMs(): number {
    const raw = process.env.AGENT_BROWSER_CMD_TIMEOUT_MS ?? "120000";
    const n = Number.parseInt(raw, 10);
    return Number.isFinite(n) && n > 0 ? n : 120_000;
}

function agentBrowserTraceEnabled(): boolean {
    return process.env.E2E_AGENT_BROWSER_LOG === "1";
}

function truncateArg(value: string, max = 200): string {
    return value.length > max ? `${value.slice(0, max - 3)}...` : value;
}

/**
 * Suite-level breadcrumbs (e.g. `beforeAll` steps). No-op unless `E2E_AGENT_BROWSER_LOG=1`.
 */
export function e2eDebugLog(message: string): void {
    if (!agentBrowserTraceEnabled()) {
        return;
    }
    console.error(`[e2e] ${new Date().toISOString()} ${message}`);
}

function execAgentBrowserOnce(args: string[]): string {
    const bin = resolveBin();
    const timeout = cmdTimeoutMs();
    const trace = agentBrowserTraceEnabled();
    const started = Date.now();
    if (trace) {
        const argLine = args.map((a) => truncateArg(a)).join(" ");
        console.error(`[e2e agent-browser] → ${new Date().toISOString()} ${argLine}`);
    }

    const r = spawnSync(bin, args, {
        encoding: "utf8",
        maxBuffer: 50 * 1024 * 1024,
        stdio: ["pipe", "pipe", "pipe"],
        timeout,
        killSignal: "SIGTERM",
    });

    const elapsed = Date.now() - started;
    const stdout = r.stdout ?? "";
    const stderr = r.stderr ?? "";

    if (trace) {
        const errCode =
            r.error != null
                ? (r.error as NodeJS.ErrnoException).code ?? r.error.message
                : "";
        console.error(
            `[e2e agent-browser] ← ${elapsed}ms status=${r.status ?? "null"} signal=${r.signal ?? ""}${errCode ? ` err=${errCode}` : ""}`,
        );
    }

    if (r.error != null) {
        const err = r.error as NodeJS.ErrnoException;
        const timedOut = err.code === "ETIMEDOUT";
        const detail =
            stderr.trim() ||
            (timedOut
                ? `subprocess timed out after ${timeout}ms (raise AGENT_BROWSER_CMD_TIMEOUT_MS if needed)`
                : err.message);
        const execErr = new Error(detail) as Error & {
            stderr?: string;
            status?: number | null;
        };
        execErr.stderr = stderr;
        execErr.status = r.status;
        throw execErr;
    }

    if (r.signal != null) {
        const detail =
            stderr.trim() ||
            `killed by ${r.signal} (often AGENT_BROWSER_CMD_TIMEOUT_MS=${timeout})`;
        const execErr = new Error(detail) as Error & {
            stderr?: string;
            status?: number | null;
        };
        execErr.stderr = stderr;
        execErr.status = r.status;
        throw execErr;
    }

    if (r.status !== 0) {
        const detail =
            stderr.trim() || stdout.trim() || `exit status ${r.status}`;
        const execErr = new Error(detail) as Error & {
            stderr?: string;
            status?: number | null;
        };
        execErr.stderr = stderr;
        execErr.status = r.status;
        throw execErr;
    }

    return stdout;
}

/**
 * Best-effort: close every agent-browser session before a suite.
 * Ignores errors (no daemon / already idle).
 */
export function resetAgentBrowserSessions(): void {
    try {
        execAgentBrowserOnce(["close", "--all"]);
    } catch {
        /* no-op */
    }
}

function resolveBin(): string {
    if (process.env.AGENT_BROWSER_BIN) {
        return process.env.AGENT_BROWSER_BIN;
    }
    const ext = process.platform === "win32" ? ".cmd" : "";
    const local = path.join(
        process.cwd(),
        "node_modules",
        ".bin",
        `agent-browser${ext}`,
    );
    if (fs.existsSync(local)) {
        return local;
    }
    return "agent-browser";
}

/**
 * Run agent-browser with args; returns stdout (trimmed unless multiline snapshot).
 * Retries on transient daemon IPC errors (e.g. macOS EAGAIN / "Resource temporarily unavailable").
 */
export function ab(args: string[]): string {
    const maxAttempts = Math.max(
        1,
        Number.parseInt(process.env.AGENT_BROWSER_AB_MAX_ATTEMPTS ?? "10", 10),
    );

    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return execAgentBrowserOnce(args);
        } catch (e: unknown) {
            const err = e as {
                stderr?: Buffer | string;
                status?: number;
                message?: string;
            };
            const stderr =
                typeof err.stderr === "string"
                    ? err.stderr
                    : err.stderr?.toString() ?? "";
            const detail = stderr || err.message || String(e);
            lastError = new Error(
                `agent-browser ${args.join(" ")} failed (status ${err.status ?? "?"}): ${detail}`,
            );

            if (
                attempt < maxAttempts &&
                isTransientDaemonMessage(detail)
            ) {
                syncSleepMs(80 * attempt + Math.floor(Math.random() * 60));
                continue;
            }
            throw lastError;
        }
    }
    throw lastError ?? new Error(`agent-browser ${args.join(" ")}: exhausted retries`);
}

export function userflowBaseUrl(): string {
    const raw = process.env.USERFLOW_BASE_URL ?? "http://localhost:3000";
    return raw.replace(/\/$/, "");
}

export function open(url: string): void {
    ab(["open", url]);
}

export function closeBrowser(): void {
    ab(["close"]);
}

export function authLogin(profile: string): void {
    ab(["auth", "login", profile]);
}

export function getUrl(): string {
    return ab(["get", "url"]).trim();
}

export function snapshotInteractive(): string {
    return ab(["snapshot", "-i"]);
}

export function waitForUrl(pattern: string): void {
    ab(["wait", "--url", pattern]);
}

export function waitForLoadState(state: "networkidle" | "load" = "networkidle"): void {
    ab(["wait", "--load", state]);
}

export function waitMs(ms: number): void {
    ab(["wait", String(ms)]);
}

export function screenshot(filename: string): void {
    if (!fs.existsSync(SCREENSHOTS_DIR)) {
        fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
    }
    ab(["screenshot", path.join(SCREENSHOTS_DIR, filename)]);
}

export function recordStart(outputPath: string): void {
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    ab(["record", "start", outputPath]);
}

export function recordStop(): void {
    ab(["record", "stop"]);
}

export function expectUrlContains(fragment: string): void {
    const u = getUrl();
    if (!u.includes(fragment)) {
        throw new Error(`expected URL to contain "${fragment}", got: ${u}`);
    }
}

export function expectSnapshotContains(text: string): void {
    const snap = snapshotInteractive();
    if (!snap.includes(text)) {
        throw new Error(
            `expected snapshot to include "${text}". Snapshot head:\n${snap.slice(0, 2500)}`,
        );
    }
}

export function getValue(selector: string): string {
    return ab(["get", "value", selector]).trim();
}

export function getAttr(selector: string, attr: string): string {
    return ab(["get", "attr", selector, attr]).trim();
}

export function isVisible(selector: string): boolean {
    const out = ab(["is", "visible", selector]).trim().toLowerCase();
    return out === "true" || out === "yes" || out.includes("true");
}

export function isEnabled(selector: string): boolean {
    const out = ab(["is", "enabled", selector]).trim().toLowerCase();
    return out === "true" || out === "yes" || out.includes("true");
}

export function getCount(selector: string): number {
    const raw = ab(["get", "count", selector]).trim();
    const n = Number.parseInt(raw, 10);
    return Number.isFinite(n) ? n : 0;
}

export function fill(sel: string, text: string): void {
    ab(["fill", sel, text]);
}

export function click(sel: string): void {
    ab(["click", sel]);
}

export function select(sel: string, value: string): void {
    ab(["select", sel, value]);
}

export function evalJs(expression: string): string {
    return ab(["eval", expression]).trim();
}
