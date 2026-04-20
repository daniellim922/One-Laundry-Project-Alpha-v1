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
    // A name for this run, shown as a prefix in log output.
    name: "worker",

    // Sandbox provider — Docker is the default runtime.
    // Codex credentials live in `.sandcastle/.codex` (e.g. auth.json); bind-mount to
    // `/home/agent/.codex` so `codex exec` inside the container sees the same store.
    sandbox: docker({
        mounts: [
            {
                hostPath: ".sandcastle/.codex",
                sandboxPath: "/home/agent/.codex",
                readonly: false,
            },
        ],
    }),

    // The agent provider. Pass a model string to codex() — sonnet balances
    // capability and speed for most tasks. Switch to claude-opus-4-6 for harder
    // problems, or claude-haiku-4-5-20251001 for speed.
    agent: codex("gpt-5.4", { effort: "medium" }),

    // Path to the prompt file. Shell expressions inside are evaluated inside the
    // sandbox at the start of each iteration, so the agent always sees fresh data.
    promptFile: "./.sandcastle/prompt.md",

    // Injected into `prompt.md` as {{TASK_FOCUS}} (see Sandcastle README: promptArgs).
    promptArgs: { TASK_FOCUS: taskFocus },

    // Maximum number of iterations (agent invocations) to run in a session.
    // Each iteration works on a single issue. Increase this to process more issues
    // per run, or set it to 1 for a single-shot mode.
    maxIterations: 3,

    // Branch strategy — merge-to-head creates a temporary branch for the agent
    // to work on, then merges the result back to HEAD when the run completes.
    // This is required when using copyToWorktree, since head mode bind-mounts
    // the host directory directly (no worktree to copy into).
    branchStrategy: { type: "merge-to-head" },
    completionSignal: "<promise>COMPLETE</promise>",

    // Copy node_modules from the host into the worktree before the sandbox
    // starts. This avoids a full npm install from scratch on every iteration.
    // The onSandboxReady hook still runs npm install as a safety net to handle
    // platform-specific binaries and any packages added since the last copy.
    copyToWorktree: ["node_modules", ".env"],

    // Lifecycle hooks — commands that run inside the sandbox at specific points.
    hooks: {
        // onSandboxReady runs once after the sandbox is initialised and the repo is
        // synced in, before the agent starts. Use it to install dependencies or run
        // any other setup steps your project needs.
        onSandboxReady: [{ command: "npm install" }],
    },
});

console.log(result.iterationsRun); // number of iterations executed
console.log(result.completionSignal); // matched signal string, or undefined if none fired
console.log(result.commits); // array of { sha } for commits created
console.log(result.branch); // target branch name
