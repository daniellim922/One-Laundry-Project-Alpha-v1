import { ReactNode } from "react";
import { requirePermission } from "@/lib/require-permission";

export default async function IAMLayout({
    children,
}: {
    children: ReactNode;
}) {
    await requirePermission("IAM (Identity and Access Management)", "read");
    return <>{children}</>;
}
