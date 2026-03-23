"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import SignatureCanvas from "react-signature-canvas";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SignaturePad({
    value,
    onChange,
    disabled,
    "aria-label": ariaLabel,
    className,
}: {
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
    "aria-label"?: string;
    className?: string;
}) {
    const sigRef = React.useRef<SignatureCanvas>(null);
    const { resolvedTheme } = useTheme();
    const penColor = resolvedTheme === "dark" ? "white" : "black";

    const handleEnd = React.useCallback(() => {
        if (sigRef.current && !sigRef.current.isEmpty()) {
            const dataUrl = sigRef.current.toDataURL("image/png");
            onChange(dataUrl);
        }
    }, [onChange]);

    const handleClear = React.useCallback(() => {
        sigRef.current?.clear();
        onChange("");
    }, [onChange]);

    return (
        <div
            className={cn("space-y-1.5", className)}
            data-disabled={disabled}>
            <div
                className={cn(
                    "overflow-hidden rounded-md border bg-background",
                    "border-input focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px]",
                    disabled && "pointer-events-none opacity-50",
                )}>
                <SignatureCanvas
                    ref={sigRef}
                    canvasProps={{
                        className: "w-full h-[120px] touch-none",
                        "aria-label": ariaLabel,
                    }}
                    onEnd={handleEnd}
                    penColor={penColor}
                    clearOnResize={false}
                />
            </div>
            <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={disabled}
                onClick={handleClear}
                className="h-7 text-xs">
                Clear
            </Button>
        </div>
    );
}
