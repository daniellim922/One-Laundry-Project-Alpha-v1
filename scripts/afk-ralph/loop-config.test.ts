import { describe, expect, it } from "vitest";

import {
    buildCodexPrompt,
    parseTarget,
    resolveExecutionCommand,
} from "./loop-config.mjs";

describe("parseTarget", () => {
    it("treats a local markdown file as a plan target", () => {
        expect(parseTarget("plans/api-boundary-refactor.md")).toEqual({
            mode: "plan",
            target: "plans/api-boundary-refactor.md",
            displayTarget: "plans/api-boundary-refactor.md",
        });
    });

    it("treats a GitHub issue URL as an issue target", () => {
        expect(
            parseTarget(
                "https://github.com/daniellim922/One-Laundry-Project-Alpha-v1/issues/55",
            ),
        ).toEqual({
            mode: "issue",
            target: "55",
            displayTarget:
                "https://github.com/daniellim922/One-Laundry-Project-Alpha-v1/issues/55",
        });
    });

    it("treats a bare issue number as an issue target", () => {
        expect(parseTarget("55")).toEqual({
            mode: "issue",
            target: "55",
            displayTarget: "55",
        });
    });
});

describe("buildCodexPrompt", () => {
    it("builds the plan-mode workflow prompt", () => {
        const prompt = buildCodexPrompt({
            mode: "plan",
            target: "plans/api-boundary-refactor.md",
            displayTarget: "plans/api-boundary-refactor.md",
            skillPath: ".codex/skills/afk-ralph-loop/SKILL.md",
            progressPath: "progress.txt",
        });

        expect(prompt).toContain("@.codex/skills/afk-ralph-loop/SKILL.md");
        expect(prompt).toContain("@plans/api-boundary-refactor.md");
        expect(prompt).toContain("@progress.txt");
        expect(prompt).toContain("$tdd is mandatory");
        expect(prompt).toContain("Write ONE failing test");
        expect(prompt).toContain("ONLY WORK ON A SINGLE PHASE");
        expect(prompt).toContain(
            "Tick that phase's acceptance criteria in plans/api-boundary-refactor.md",
        );
        expect(prompt).toContain(
            "Commit your changes before starting on the next phase",
        );
        expect(prompt).toContain("<promise>COMPLETE</promise>");
    });

    it("builds the GitHub-issue workflow prompt", () => {
        const prompt = buildCodexPrompt({
            mode: "issue",
            target: "55",
            displayTarget:
                "https://github.com/daniellim922/One-Laundry-Project-Alpha-v1/issues/55",
            skillPath: ".codex/skills/afk-ralph-loop/SKILL.md",
            progressPath: "progress.txt",
        });

        expect(prompt).toContain("@.codex/skills/afk-ralph-loop/SKILL.md");
        expect(prompt).toContain("@progress.txt");
        expect(prompt).toContain("The parent PRD issue is GitHub issue #55");
        expect(prompt).toContain(
            "Read the parent issue task list and select the first incomplete child issue",
        );
        expect(prompt).toContain(
            "Update the child issue acceptance criteria or checklist",
        );
        expect(prompt).toContain("Update the parent issue task list");
        expect(prompt).toContain("Close the child issue after committing");
        expect(prompt).toContain("ONLY WORK ON A SINGLE CHILD ISSUE");
        expect(prompt).toContain("<promise>COMPLETE</promise>");
    });
});

describe("resolveExecutionCommand", () => {
    it("uses the current Codex no-sandbox execution contract", () => {
        expect(resolveExecutionCommand()).toEqual([
            "codex",
            "exec",
            "--dangerously-bypass-approvals-and-sandbox",
            "--cd",
            ".",
            "-",
        ]);
    });
});
