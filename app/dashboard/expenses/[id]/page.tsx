import { permanentRedirect } from "next/navigation";

/** Canonical detail URL is `/dashboard/expenses/[id]/view`; this preserves old links. */
export default async function ExpenseDetailRedirectPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    permanentRedirect(`/dashboard/expenses/${id}/view`);
}
