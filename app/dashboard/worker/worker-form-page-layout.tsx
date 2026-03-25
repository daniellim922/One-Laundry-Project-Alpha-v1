import type { ReactNode } from "react";

import { BackButton } from "@/components/back-button";

interface WorkerFormPageLayoutProps {
    title: string;
    description: string;
    /** e.g. primary action aligned to the far right of the header row */
    actions?: ReactNode;
    children: ReactNode;
}

export function WorkerFormPageLayout({
    title,
    description,
    actions,
    children,
}: WorkerFormPageLayoutProps) {
    return (
        <div className="flex min-h-[calc(100vh-4rem)] items-start justify-center">
            <div className="w-full max-w-6xl space-y-6 py-8">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                        <BackButton />
                        <div className="min-w-0">
                            <h1 className="text-xl font-semibold tracking-wide uppercase">
                                {title}
                            </h1>
                            <p className="text-muted-foreground text-sm">
                                {description}
                            </p>
                        </div>
                    </div>
                    {actions != null ? (
                        <div className="shrink-0">{actions}</div>
                    ) : null}
                </div>

                {children}
            </div>
        </div>
    );
}
