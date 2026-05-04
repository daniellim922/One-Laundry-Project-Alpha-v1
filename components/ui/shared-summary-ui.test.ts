import React from "react";
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import { removeQueryParam } from "@/components/ui/summary-capture";
import { VoucherSignatureSection } from "@/components/ui/signature-section";
import { StepProgressPanel } from "@/components/ui/step-progress-panel";

vi.mock("next/link", () => ({
    default: ({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) =>
        React.createElement("a", { href, className }, children),
}));

describe("StepProgressPanel", () => {
    it("renders route-specific step links and final action", () => {
        const html = renderToStaticMarkup(
            React.createElement(StepProgressPanel, {
                steps: [
                    {
                        id: 1,
                        label: "Advance Breakdown",
                        href: "/dashboard/advance/req-1/breakdown",
                    },
                    {
                        id: 2,
                        label: "Summary & Download",
                        href: "/dashboard/advance/req-1/summary",
                    },
                ],
                activeStep: 2,
                finalAction: {
                    id: 3,
                    content: React.createElement("button", null, "Settle"),
                },
            }),
        );

        expect(html).toContain('href="/dashboard/advance/req-1/breakdown"');
        expect(html).toContain('href="/dashboard/advance/req-1/summary"');
        expect(html).toContain("Advance Breakdown");
        expect(html).toContain("Summary &amp; Download");
        expect(html).toContain("Settle");
    });
});

describe("VoucherSignatureSection", () => {
    it("renders shared payroll signature wording with worker name", () => {
        const html = renderToStaticMarkup(
            React.createElement(VoucherSignatureSection, {
                approvedLabel: "Payment approved",
                receivedLabel: "Payment received",
                approverName: "Alvis Ong Thai Ying",
                receiverName: "AHMMED",
                approvedDate: "01/04/2026",
            }),
        );

        expect(html).toContain("Payment approved by Alvis Ong Thai Ying");
        expect(html).toContain("Payment received by AHMMED");
        expect(html).toContain("01/04/2026");
    });
});

describe("removeQueryParam", () => {
    it("removes download=1 and keeps other query params", () => {
        const params = new URLSearchParams("download=1&mode=voucher");
        const next = removeQueryParam(params, "download");

        expect(next).toBe("mode=voucher");
    });
});
