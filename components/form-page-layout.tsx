import type { ReactNode } from "react";
import { PageBackButton } from "./ui/page-back-button";

type FormPageLayoutProps = {
    title: string;
    subtitle: ReactNode;
    /** Optional status badge/content rendered between title and actions. */
    status?: ReactNode;
    /** e.g. primary action aligned to the far right of the header row */
    actions?: ReactNode;
    children: ReactNode;
    /** Controls the inner container max width. */
    maxWidthClassName?: string;
};

export function FormPageLayout({
    title,
    subtitle,
    status,
    actions,
    children,
    maxWidthClassName = "max-w-6xl",
}: FormPageLayoutProps) {
    return (
        <div>
            <header className="flex flex-wrap items-center gap-3 gap-y-4">
                <TitleBlock title={title} subtitle={subtitle} status={status} />
                <ActionsSlot actions={actions} />
            </header>
            <div className="flex min-h-[calc(100vh-4rem)] w-full items-start justify-center">
                <div className={`w-full ${maxWidthClassName} space-y-6 py-8`}>
                    {children}
                </div>
            </div>
        </div>
    );
}

function TitleBlock({
    title,
    subtitle,
    status,
}: {
    title: string;
    subtitle: ReactNode;
    status?: ReactNode;
}) {
    return (
        <div className="flex min-w-0 flex-1 items-center gap-3">
            <PageBackButton />
            <div className="min-w-0">
                <div className="flex min-w-0 items-center gap-2">
                    <h1 className="truncate text-xl font-semibold tracking-wide uppercase">
                        {title}
                    </h1>
                    {status != null ? <div className="shrink-0">{status}</div> : null}
                </div>
                <p className="text-muted-foreground text-sm">{subtitle}</p>
            </div>
        </div>
    );
}

function ActionsSlot({ actions }: { actions?: ReactNode }) {
    if (actions == null) return null;
    return <div className="ml-auto shrink-0">{actions}</div>;
}
