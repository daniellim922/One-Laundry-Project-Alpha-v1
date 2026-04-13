#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

const WATCHED_PREFIXES = [
  "app/",
  "components/",
  "db/",
  "lib/",
  "utils/",
  "types/",
  "test/",
];

const WATCHED_FILES = new Set([
  "package.json",
  "package-lock.json",
  "tsconfig.json",
  "playwright.config.ts",
  "vitest.config.ts",
  "eslint.config.mjs",
  "next.config.ts",
  "next.config.mjs",
  "next.config.js",
]);

function run(command, args, cwd) {
  return spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function emit(payload) {
  process.stdout.write(JSON.stringify(payload));
}

function getRepoRoot(cwd) {
  const result = run("git", ["rev-parse", "--show-toplevel"], cwd);
  if (result.status !== 0) return null;
  return result.stdout.trim();
}

function getChangedFiles(repoRoot) {
  const tracked = run("git", ["diff", "--name-only", "HEAD", "--"], repoRoot);
  const untracked = run(
    "git",
    ["ls-files", "--others", "--exclude-standard"],
    repoRoot,
  );

  const files = new Set();

  for (const blob of [tracked.stdout, untracked.stdout]) {
    for (const line of blob.split("\n")) {
      const file = line.trim();
      if (file) files.add(file);
    }
  }

  return [...files].sort();
}

function shouldRunFullTests(files) {
  return files.some(
    (file) =>
      WATCHED_FILES.has(file) ||
      WATCHED_PREFIXES.some((prefix) => file.startsWith(prefix)),
  );
}

function main() {
  let input;

  try {
    input = JSON.parse(readFileSync(0, "utf8"));
  } catch {
    emit({ continue: true });
    return;
  }

  const cwd = path.resolve(input.cwd ?? ".");
  const repoRoot = getRepoRoot(cwd);
  if (!repoRoot) {
    emit({ continue: true });
    return;
  }

  const changedFiles = getChangedFiles(repoRoot);
  if (changedFiles.length === 0) {
    emit({ continue: true });
    return;
  }

  if (!shouldRunFullTests(changedFiles)) {
    emit({
      continue: true,
      systemMessage:
        "Post-implementation verification skipped: only docs, prompts, rules, or metadata changed.",
    });
    return;
  }

  const testRun = run("npm", ["run", "test"], repoRoot);
  if (testRun.status === 0) {
    emit({
      continue: true,
      systemMessage: "Post-implementation verification passed: npm run test",
    });
    return;
  }

  const combined = [testRun.stdout, testRun.stderr]
    .filter(Boolean)
    .join("\n")
    .trim();
  const tail = combined
    ? combined.split("\n").slice(-20).join("\n")
    : "No output captured.";

  emit({
    continue: false,
    stopReason: "Post-implementation verification failed.",
    systemMessage:
      "Post-implementation verification failed: `npm run test`\n\n" + tail,
  });
}

main();
