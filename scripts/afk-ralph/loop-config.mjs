const ISSUE_URL_PATTERN =
    /^https:\/\/github\.com\/[^/]+\/[^/]+\/issues\/(\d+)\/?$/;
const ISSUE_NUMBER_PATTERN = /^\d+$/;

export function parseTarget(input) {
    const normalized = input.trim();

    if (normalized.endsWith(".md")) {
        return {
            mode: "plan",
            target: normalized,
            displayTarget: normalized,
        };
    }

    const issueUrlMatch = normalized.match(ISSUE_URL_PATTERN);
    if (issueUrlMatch) {
        return {
            mode: "issue",
            target: issueUrlMatch[1],
            displayTarget: normalized,
        };
    }

    if (ISSUE_NUMBER_PATTERN.test(normalized)) {
        return {
            mode: "issue",
            target: normalized,
            displayTarget: normalized,
        };
    }

    throw new Error(
        "Target must be a local Markdown PRD path, a GitHub issue URL, or a GitHub issue number.",
    );
}

export function buildCodexPrompt(options) {
    const sharedLines = [
        `@${options.skillPath} @${options.progressPath}${
            options.mode === "plan" ? ` @${options.target}` : ""
        }`,
        "Use the attached repo-local Ralph loop skill as the workflow contract.",
        "$tdd is mandatory.",
        "Start with a vertical red-green-refactor slice through a public interface.",
        "Write ONE failing test for the next behavior before implementation.",
        "Make the minimum code change to pass that test, then refactor safely.",
        "Run focused checks for the slice first, then relevant broader verification before commit.",
        "1. Find the highest-priority incomplete work item and implement it.",
        "2. Run your tests and relevant type checks for that slice.",
        "3. Update the source of truth with what was done.",
        "4. Append your progress to progress.txt.",
        "5. Commit your changes.",
    ];

    const modeLines =
        options.mode === "plan"
            ? [
                  `The active plan file is ${options.target}.`,
                  "ONLY WORK ON A SINGLE PHASE.",
                  `Tick that phase's acceptance criteria in ${options.target}.`,
                  "Commit your changes before starting on the next phase.",
                  "If all phases are complete, output <promise>COMPLETE</promise>.",
              ]
            : [
                  `The parent PRD issue is GitHub issue #${options.target}.`,
                  "Read the parent issue task list and select the first incomplete child issue.",
                  "ONLY WORK ON A SINGLE CHILD ISSUE.",
                  "Update the child issue acceptance criteria or checklist.",
                  "Update the parent issue task list.",
                  "Close the child issue after committing.",
                  "If no incomplete child issues remain, output <promise>COMPLETE</promise>.",
              ];

    return [...sharedLines, ...modeLines].join("\n");
}

export function resolveExecutionCommand() {
    return [
        "codex",
        "exec",
        "--dangerously-bypass-approvals-and-sandbox",
        "--cd",
        ".",
        "-",
    ];
}
