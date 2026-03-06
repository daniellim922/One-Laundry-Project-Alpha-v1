import type { ReactNode } from "react";

interface WorkerFormPageLayoutProps {
    title: string;
    description: string;
    children: ReactNode;
}

export function WorkerFormPageLayout({
    title,
    description,
    children,
}: WorkerFormPageLayoutProps) {
    return (
        <div className="flex min-h-[calc(100vh-4rem)] items-start justify-center">
            <div className="w-full max-w-3xl space-y-6 py-8">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">
                        {title}
                    </h1>
                    <p className="text-muted-foreground">{description}</p>
                </div>

                {children}
            </div>
        </div>
    );
}
