"use client";

import * as React from "react";
import { Maximize2 } from "lucide-react";
import SignatureCanvas from "react-signature-canvas";

import { Button } from "@/components/ui/button";
import { FullscreenSignatureDialog } from "@/components/ui/fullscreen-signature-dialog";
import { signaturePadPenDefaults } from "@/components/ui/signature-pen-defaults";
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
    const dialogTitle = (ariaLabel ?? "Signature").trim() || "Signature";
    const [fullscreenOpen, setFullscreenOpen] = React.useState(false);

    const sigRef = React.useRef<SignatureCanvas>(null);
    const lastAppliedValueRef = React.useRef<string | null>(null);

    React.useEffect(() => {
        const sig = sigRef.current;
        if (!sig) return;
        const next = (value ?? "").trim();
        if (next === lastAppliedValueRef.current) return;
        lastAppliedValueRef.current = next || null;
        if (!next) {
            sig.clear();
            return;
        }
        if (next.startsWith("data:image/png;base64,")) {
            void sig.fromDataURL(next);
        }
    }, [value]);

    const handleEnd = React.useCallback(() => {
        if (sigRef.current && !sigRef.current.isEmpty()) {
            const dataUrl = sigRef.current.toDataURL("image/png");
            lastAppliedValueRef.current = dataUrl;
            onChange(dataUrl);
        }
    }, [onChange]);

    const handleClear = React.useCallback(() => {
        sigRef.current?.clear();
        lastAppliedValueRef.current = null;
        onChange("");
    }, [onChange]);

    const handleFullscreenCommit = React.useCallback(
        (dataUrl: string) => {
            onChange(dataUrl);
        },
        [onChange],
    );

    return (
        <div
            className={cn("space-y-1.5", className)}
            data-disabled={disabled}>
            <div
                className={cn(
                    "overflow-hidden rounded-md border bg-white",
                    "border-input focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px]",
                    disabled && "pointer-events-none opacity-50",
                )}>
                <SignatureCanvas
                    ref={sigRef}
                    {...signaturePadPenDefaults}
                    canvasProps={{
                        className: "w-full h-[160px] touch-none",
                        "aria-label": ariaLabel,
                    }}
                    onEnd={handleEnd}
                    clearOnResize={false}
                />
            </div>
            <div className="flex flex-wrap items-center gap-2">
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={disabled}
                    onClick={handleClear}
                    className="h-7 text-xs">
                    Clear
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={disabled}
                    onClick={() => setFullscreenOpen(true)}
                    className="h-7 gap-1 text-xs"
                    aria-label={`${dialogTitle} — sign fullscreen`}>
                    <Maximize2 className="size-3.5 shrink-0" aria-hidden />
                    Full screen
                </Button>
            </div>
            <FullscreenSignatureDialog
                open={fullscreenOpen}
                onOpenChange={setFullscreenOpen}
                title={dialogTitle}
                initialValue={value}
                disabled={disabled}
                onCommit={handleFullscreenCommit}
            />
        </div>
    );
}
