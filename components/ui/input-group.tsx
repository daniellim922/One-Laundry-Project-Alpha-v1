"use client";

import * as React from "react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const InputGroup = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div
        ref={ref}
        data-slot="input-group"
        className={cn(
            "border-input flex min-w-0 flex-wrap items-stretch rounded-md border bg-transparent shadow-xs transition-[color,box-shadow] has-[[data-slot=input-group-control]:focus-visible]:border-ring has-[[data-slot=input-group-control]:focus-visible]:ring-ring/50 has-[[data-slot=input-group-control]:focus-visible]:ring-[3px] has-[[data-slot=input-group-control][aria-invalid=true]]:border-destructive has-[[data-slot=input-group-control][aria-invalid=true]]:ring-destructive/20",
            className,
        )}
        {...props}
    />
));
InputGroup.displayName = "InputGroup";

type InputGroupAddonAlign =
    | "inline-start"
    | "inline-end"
    | "block-start"
    | "block-end";

const InputGroupAddon = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement> & {
        align?: InputGroupAddonAlign;
    }
>(({ className, align = "inline-start", ...props }, ref) => (
    <div
        ref={ref}
        data-slot="input-group-addon"
        data-align={align}
        className={cn(
            "text-muted-foreground [&>svg]:size-4 flex items-center gap-1 [&>svg]:shrink-0 [&>svg]:pointer-events-none",
            align === "inline-start" && "order-first pl-3 pr-2",
            align === "inline-end" && "order-last pl-2 pr-3",
            align === "block-start" &&
                "order-first w-full flex-row gap-2 border-b border-input px-3 py-2",
            align === "block-end" &&
                "order-last w-full flex-row gap-2 border-t border-input px-3 py-2",
            className,
        )}
        {...props}
    />
));
InputGroupAddon.displayName = "InputGroupAddon";

const InputGroupInput = React.forwardRef<
    HTMLInputElement,
    React.ComponentProps<typeof Input>
>(({ className, ...props }, ref) => (
    <Input
        ref={ref}
        data-slot="input-group-control"
        className={cn(
            "order-2 min-w-0 flex-1 border-0 bg-transparent shadow-none focus-visible:ring-0",
            className,
        )}
        {...props}
    />
));
InputGroupInput.displayName = "InputGroupInput";

const InputGroupText = React.forwardRef<
    HTMLSpanElement,
    React.HTMLAttributes<HTMLSpanElement>
>(({ className, ...props }, ref) => (
    <span
        ref={ref}
        data-slot="input-group-text"
        className={cn("text-sm", className)}
        {...props}
    />
));
InputGroupText.displayName = "InputGroupText";

const InputGroupButton = React.forwardRef<
    HTMLButtonElement,
    React.ComponentProps<typeof Button>
>(({ className, variant = "ghost", size = "xs", ...props }, ref) => (
    <Button
        ref={ref}
        type="button"
        variant={variant}
        size={size}
        className={cn("-my-1.5 shrink-0", className)}
        {...props}
    />
));
InputGroupButton.displayName = "InputGroupButton";

function InputGroupTextarea({
    className,
    ...props
}: React.ComponentProps<"textarea">) {
    return (
        <textarea
            data-slot="input-group-control"
            className={cn(
                "border-input placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 flex min-h-20 w-full min-w-0 flex-1 resize-none rounded-md border-0 bg-transparent px-3 py-2 text-base shadow-none outline-none file:inline-flex file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
                "focus-visible:outline-none",
                "aria-invalid:outline-none",
                className,
            )}
            {...props}
        />
    );
}

export {
    InputGroup,
    InputGroupAddon,
    InputGroupButton,
    InputGroupInput,
    InputGroupText,
    InputGroupTextarea,
};
