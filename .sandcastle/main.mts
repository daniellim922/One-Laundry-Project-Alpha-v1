import { config } from "dotenv";
import { run, codex } from "@ai-hero/sandcastle";
import { docker } from "@ai-hero/sandcastle/sandboxes/docker";

// Loads `.sandcastle/.env` when you run from the repo root (`npm run sandcastle`).
config({ path: ".sandcastle/.env" });

const sandcastleIssue = process.env.SANDCASTLE_ISSUE?.trim();
const taskFocus = sandcastleIssue
    ? `**Pinned issue:** #${sandcastleIssue}. Work only on this issue for this run. If it is not listed under Open issues, run \`gh issue view ${sandcastleIssue}\` to load it; if it is closed or out of scope, comment and stop without closing it.`
    : `**Pinned issue:** none — pick the highest-priority open Sandcastle-labeled issue from the list below, skipping any issue blocked by another open issue.`;

// Simple loop: an agent that picks open GitHub issues one by one and closes them.
// Run this with: npx tsx .sandcastle/main.mts
// Or add to package.json scripts: "sandcastle": "npx tsx .sandcastle/main.mts"
// Optional: set SANDCASTLE_ISSUE=123 in `.sandcastle/.env` to force a single issue.

const result = await run({
    name: "test-new-payroll",
    agent: codex("gpt-5.3-codex", { effort: "medium" }),
    sandbox: docker({
        imageName: "sandcastle:local",
        mounts: [
            {
                hostPath: "~/.codex",
                sandboxPath: "/home/agent/.codex",
                readonly: true,
            },
        ],
    }),

    promptFile: "./.sandcastle/prompt.md",

    promptArgs: { TASK_FOCUS: taskFocus },
    maxIterations: 3,
    branchStrategy: { type: "branch", branch: "test-new-payroll" },
    copyToWorktree: ["node_modules", ".env"],
    hooks: {
        onSandboxReady: [{ command: "npm install" }],
    },
    // completionSignal: "<promise>COMPLETE</promise>",
});

console.log(result.iterationsRun); // number of iterations executed
// console.log(result.completionSignal); // matched signal string, or undefined if none fired
console.log(result.commits); // array of { sha } for commits created
console.log(result.branch); // target branch name
