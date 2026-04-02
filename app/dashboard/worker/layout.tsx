import { ReactNode } from "react";
import { requirePermission } from "@/utils/require-permission";

export default async function WorkersLayout({
    children,
}: {
    children: ReactNode;
}) {
    await requirePermission("Workers", "read");
    return <>{children}</>;
}
