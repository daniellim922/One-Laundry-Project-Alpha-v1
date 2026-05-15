import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const tanStackIocs = [
    "@tanstack/setup",
    "router_init.js",
    "79ac49eedf774dd4b0cfa308722bc463cfe5885c",
];
const textFilesToScan = ["package.json", "package-lock.json"];
const directoriesToScanForPayload = ["node_modules"];

function runNpmAudit() {
    execFileSync("npm", ["audit", "--audit-level=moderate"], {
        cwd: root,
        stdio: "inherit",
    });
}

function scanTextFiles() {
    const hits = [];

    for (const file of textFilesToScan) {
        const path = join(root, file);

        if (!existsSync(path)) {
            continue;
        }

        const content = readFileSync(path, "utf8");

        for (const indicator of tanStackIocs) {
            if (content.includes(indicator)) {
                hits.push(`${file}: ${indicator}`);
            }
        }
    }

    return hits;
}

function scanForPayloadFile(directory) {
    const hits = [];
    const start = join(root, directory);

    if (!existsSync(start)) {
        return hits;
    }

    const stack = [start];

    while (stack.length > 0) {
        const current = stack.pop();

        for (const entry of readdirSync(current, { withFileTypes: true })) {
            const path = join(current, entry.name);

            if (entry.isDirectory()) {
                stack.push(path);
                continue;
            }

            if (entry.isFile() && entry.name === "router_init.js") {
                const size = statSync(path).size;
                hits.push(`${path} (${size} bytes)`);
            }
        }
    }

    return hits;
}

function scanTanStackIocs() {
    const textHits = scanTextFiles();
    const payloadHits = directoriesToScanForPayload.flatMap(scanForPayloadFile);
    const hits = [...textHits, ...payloadHits];

    if (hits.length > 0) {
        console.error("TanStack supply-chain IOC scan failed:");
        for (const hit of hits) {
            console.error(`- ${hit}`);
        }
        process.exitCode = 1;
        return;
    }

    console.log("TanStack supply-chain IOC scan passed.");
}

runNpmAudit();
scanTanStackIocs();
