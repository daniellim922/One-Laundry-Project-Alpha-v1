import { spawnSync } from "node:child_process";

const supabaseStudioUrl = "http://127.0.0.1:54323";

function openUrl(url: string): number {
    const opener =
        process.platform === "darwin"
            ? "open"
            : process.platform === "win32"
              ? "start"
              : "xdg-open";

    const result = spawnSync(opener, [url], {
        shell: process.platform === "win32",
        stdio: "ignore",
    });

    return result.status ?? 1;
}

const exitCode = openUrl(supabaseStudioUrl);

if (exitCode !== 0) {
    console.log(`Supabase Studio is available at ${supabaseStudioUrl}`);
    process.exit(0);
}

console.log(`Opened Supabase Studio at ${supabaseStudioUrl}`);
