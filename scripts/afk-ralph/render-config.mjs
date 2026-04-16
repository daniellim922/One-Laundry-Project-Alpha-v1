import {
    buildCodexPrompt,
    parseTarget,
    resolveExecutionCommand,
} from "./loop-config.mjs";

const [targetInput] = process.argv.slice(2);

if (!targetInput) {
    console.error("Usage: node scripts/afk-ralph/render-config.mjs <target>");
    process.exit(1);
}

const target = parseTarget(targetInput);
const skillPath = ".codex/skills/afk-ralph-loop/SKILL.md";
const progressPath = "progress.txt";

const payload = {
    ...target,
    skillPath,
    progressPath,
    prompt: buildCodexPrompt({
        ...target,
        skillPath,
        progressPath,
    }),
    command: resolveExecutionCommand(),
};

process.stdout.write(JSON.stringify(payload));
