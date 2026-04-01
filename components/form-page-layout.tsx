import type { ReactNode } from "react";
import { PageBackButton } from "./page-back-button";

type FormPageLayoutProps = {
    title: string;
    subtitle: ReactNode;
    /** e.g. primary action aligned to the far right of the header row */
    actions?: ReactNode;
    children: ReactNode;
    /** Controls the inner container max width. */
    maxWidthClassName?: string;
};

export function FormPageLayout({
    title,
    subtitle,
    actions,
    children,
    maxWidthClassName = "max-w-6xl",
}: FormPageLayoutProps) {
    return (
        <div>
            <header className="flex flex-wrap items-center justify-between gap-3 gap-y-4">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                    <PageBackButton />
                    <div className="min-w-0">
                        <h1 className="text-xl font-semibold tracking-wide uppercase">
                            {title}
                        </h1>
                        <p className="text-muted-foreground text-sm">
                            {subtitle}
                        </p>
                    </div>
                </div>
                {actions != null ? (
                    <div className="shrink-0">{actions}</div>
                ) : null}
            </header>
            <div className="flex min-h-[calc(100vh-4rem)] w-full items-start justify-center">
                <div className={`w-full ${maxWidthClassName} space-y-6 py-8`}>
                    {children}
                </div>
            </div>
        </div>
    );
}
