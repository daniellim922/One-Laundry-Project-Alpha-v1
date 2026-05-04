/** @vitest-environment jsdom */

import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
    push: vi.fn(),
    refresh: vi.fn(),
    createAdvanceRequest: vi.fn(),
    updateAdvanceRequest: vi.fn(),
}));

vi.mock("next/navigation", () => ({
    useRouter: () => ({
        push: mocks.push,
        refresh: mocks.refresh,
    }),
}));

vi.mock("@/app/dashboard/advance/new/actions", () => ({
    createAdvanceRequest: (...args: unknown[]) =>
        mocks.createAdvanceRequest(...args),
}));

vi.mock("@/app/dashboard/advance/[id]/edit/actions", () => ({
    updateAdvanceRequest: (...args: unknown[]) =>
        mocks.updateAdvanceRequest(...args),
}));

vi.mock("@/lib/client/generate-and-upload-pdf", () => ({
    generateAndUploadAdvancePdf: vi.fn().mockResolvedValue({
        advanceRequestId: "advance-request-1",
        blob: new Blob(),
        storagePath: "advance/advance-request-1/voucher.pdf",
    }),
}));

vi.mock("@/components/ui/signature-pad", () => ({
    SignaturePad: () => null,
}));

import { AdvanceRequestForm } from "@/app/dashboard/advance/advance-request-form";
import type { AdvanceRequestDetail } from "@/utils/advance/queries";

function makeAdvanceRequestDetail(): AdvanceRequestDetail {
    return {
        request: {
            id: "advance-request-1",
            workerId: "worker-1",
            workerName: "Aisyah",
            amountRequested: 600,
            status: "Advance Loan",
            requestDate: "2026-04-01",
            createdAt: new Date("2026-04-01T00:00:00Z"),
            updatedAt: new Date("2026-04-02T00:00:00Z"),
        },
        advances: [
            {
                id: "advance-1",
                amount: 300,
                repaymentDate: "2026-04-10",
                status: "Installment Paid",
            },
            {
                id: "advance-2",
                amount: 300,
                repaymentDate: "2026-05-10",
                status: "Installment Loan",
            },
        ],
        purpose: "Emergency expense",
        employeeSignature: null,
        employeeSignatureDate: null,
        managerSignature: null,
        managerSignatureDate: null,
    };
}

describe("AdvanceRequestForm", () => {
    afterEach(() => {
        cleanup();
    });

    beforeAll(() => {
        Object.assign(Element.prototype, {
            hasPointerCapture: () => false,
            setPointerCapture: () => {},
            releasePointerCapture: () => {},
            scrollIntoView: () => {},
        });
    });

    beforeEach(() => {
        vi.clearAllMocks();
        mocks.createAdvanceRequest.mockResolvedValue({ success: true, id: "advance-request-1" });
        mocks.updateAdvanceRequest.mockResolvedValue({ success: true, id: "advance-request-1" });
    });

    it("disables delete for paid installment rows in edit mode", async () => {
        render(
            <AdvanceRequestForm
                workers={[{ id: "worker-1", name: "Aisyah" }]}
                initialData={makeAdvanceRequestDetail()}
                advanceRequestId="advance-request-1"
            />,
        );

        const paidInstallmentRow = await screen.findByRole("group", {
            name: "Installment row 1",
        });

        expect(
            (
                within(paidInstallmentRow).getByRole("button", {
                    name: "Remove this installment row",
                }) as HTMLButtonElement
            ).disabled,
        ).toBe(true);
    });

    it("keeps delete enabled for unpaid installment rows in edit mode", async () => {
        render(
            <AdvanceRequestForm
                workers={[{ id: "worker-1", name: "Aisyah" }]}
                initialData={makeAdvanceRequestDetail()}
                advanceRequestId="advance-request-1"
            />,
        );

        const unpaidInstallmentRow = await screen.findByRole("group", {
            name: "Installment row 2",
        });

        expect(
            (
                within(unpaidInstallmentRow).getByRole("button", {
                    name: "Remove this installment row",
                }) as HTMLButtonElement
            ).disabled,
        ).toBe(false);
    });
});
