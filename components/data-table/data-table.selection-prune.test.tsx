/** @vitest-environment jsdom */

import React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import type { RowSelectionState } from "@tanstack/react-table";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("next/navigation", () => ({
    useRouter: () => ({ replace: vi.fn() }),
    usePathname: () => "/dashboard/test",
    useSearchParams: () => new URLSearchParams(),
}));

import { DataTable } from "./data-table";

type Row = { id: string; name: string };

const columns: ColumnDef<Row>[] = [
    {
        accessorKey: "name",
        header: "Name",
    },
];

const sampleData: Row[] = [
    { id: "a", name: "Alpha" },
    { id: "b", name: "Beta" },
];

afterEach(() => {
    cleanup();
});

describe("DataTable selection prune on filter", () => {
    it("removes selected row IDs that no longer pass the global filter", async () => {
        const user = userEvent.setup();
        const latestSelection = { current: null as RowSelectionState | null };

        function Harness() {
            const [rowSelection, setRowSelection] =
                React.useState<RowSelectionState>({
                    a: true,
                    b: true,
                });
            latestSelection.current = rowSelection;
            return (
                <DataTable<Row, unknown>
                    columns={columns}
                    data={sampleData}
                    enableRowSelection
                    getRowId={(row) => row.id}
                    rowSelection={rowSelection}
                    onRowSelectionChange={(updater) => {
                        setRowSelection((prev) => {
                            const next =
                                typeof updater === "function"
                                    ? updater(prev)
                                    : updater;
                            return next;
                        });
                    }}
                    syncSearchToUrl={false}
                />
            );
        }

        render(<Harness />);

        const search = screen.getByPlaceholderText("Search...");
        await user.clear(search);
        await user.type(search, "Beta");

        await waitFor(() => {
            expect(latestSelection.current).toEqual({ b: true });
        });
    });
});
