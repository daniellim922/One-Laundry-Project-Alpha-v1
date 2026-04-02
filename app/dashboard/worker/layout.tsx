import { ReactNode } from "react";
import { requirePermission } from "@/utils/permissions/require-permission";

export default async function WorkersLayout({
    children,
}: {
    children: ReactNode;
}) {
    await requirePermission("Workers", "read");
    return <>{children}</>;
}
