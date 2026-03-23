import { ReactNode } from "react";
import { requirePermission } from "@/lib/require-permission";

export default async function WorkersLayout({
    children,
}: {
    children: ReactNode;
}) {
    await requirePermission("Workers", "read");
    return <>{children}</>;
}
