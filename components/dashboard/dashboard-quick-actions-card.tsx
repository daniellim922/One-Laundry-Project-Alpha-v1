import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import type { VariantProps } from "class-variance-authority";

import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";

export type DashboardQuickAction = {
    href: string;
    label: string;
    icon: LucideIcon;
};

type ButtonVariant = NonNullable<VariantProps<typeof buttonVariants>["variant"]>;

export function DashboardQuickActionsCard({
    title,
    description,
    actions,
    buttonVariant = "outline",
    className,
}: {
    title: string;
    description?: string;
    actions: DashboardQuickAction[];
    buttonVariant?: ButtonVariant;
    className?: string;
}) {
    return (
        <Card className={cn("min-w-0", className)}>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
                {description ? (
                    <CardDescription>{description}</CardDescription>
                ) : null}
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
                {actions.map(({ href, label, icon: Icon }) => (
                    <Button
                        key={`${href}:${label}`}
                        variant={buttonVariant}
                        className={cn(
                            buttonVariant === "outline" &&
                                "transition-colors hover:bg-primary/10 hover:text-foreground hover:border-foreground/15 dark:hover:border-input dark:hover:bg-input/50 dark:hover:text-accent-foreground",
                        )}
                        asChild>
                        <Link
                            href={href}
                            className="inline-flex items-center gap-2">
                            <Icon className="h-4 w-4 shrink-0" />
                            {label}
                        </Link>
                    </Button>
                ))}
            </CardContent>
        </Card>
    );
}
