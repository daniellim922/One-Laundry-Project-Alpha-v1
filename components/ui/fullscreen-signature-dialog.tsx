"use client";

import * as React from "react";
import SignatureCanvas from "react-signature-canvas";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogTitle,
} from "@/components/ui/dialog";
import { signaturePadPenDefaults } from "@/components/ui/signature-pen-defaults";
import { cn } from "@/lib/utils";

export function FullscreenSignatureDialog({
    open,
    onOpenChange,
    title,
    initialValue,
    disabled,
    onCommit,
    className,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    initialValue: string;
    disabled?: boolean;
    onCommit: (dataUrl: string) => void;
    className?: string;
}) {
    const sigRef = React.useRef<SignatureCanvas>(null);
    const containerRef = React.useRef<HTMLDivElement>(null);

    const captureSnapshot = React.useCallback(() => {
        const sig = sigRef.current;
        if (!sig || sig.isEmpty()) return "";
        return sig.toDataURL("image/png");
    }, []);

    const resizeAndRestore = React.useCallback((imageDataUrl: string) => {
        const sig = sigRef.current;
        const wrapper = containerRef.current;
        if (!sig || !wrapper) return;

        const w = wrapper.clientWidth;
        const h = wrapper.clientHeight;
        if (w <= 0 || h <= 0) return;

        const canvas = sig.getCanvas();
        const dpr = Math.max(window.devicePixelRatio ?? 1, 1);

        canvas.width = Math.floor(w * dpr);
        canvas.height = Math.floor(h * dpr);
        canvas.style.width = `${w}px`;
        canvas.style.height = `${h}px`;

        const ctx = canvas.getContext("2d");
        ctx?.setTransform(1, 0, 0, 1, 0, 0);
        ctx?.scale(dpr, dpr);

        const next = imageDataUrl.trim();
        if (next.startsWith("data:image/png;base64,")) {
            void sig.fromDataURL(next);
        } else {
            sig.clear();
        }
    }, []);

    React.useLayoutEffect(() => {
        if (!open) return;

        const runInitial = () => {
            resizeAndRestore((initialValue ?? "").trim());
        };

        if (
            containerRef.current &&
            containerRef.current.clientWidth > 0 &&
            containerRef.current.clientHeight > 0
        ) {
            runInitial();
        } else {
            requestAnimationFrame(runInitial);
        }

        const wrapper = containerRef.current;
        if (!wrapper) return undefined;

        const ro = new ResizeObserver(() => {
            const snap = captureSnapshot();
            resizeAndRestore(snap);
        });
        ro.observe(wrapper);
        return () => ro.disconnect();
    }, [open, initialValue, captureSnapshot, resizeAndRestore]);

    const handleClear = React.useCallback(() => {
        sigRef.current?.clear();
    }, []);

    const handleCancel = React.useCallback(() => {
        onOpenChange(false);
    }, [onOpenChange]);

    const handleDone = React.useCallback(() => {
        const sig = sigRef.current;
        const dataUrl =
            sig && !sig.isEmpty() ? sig.toDataURL("image/png") : "";
        onCommit(dataUrl);
        onOpenChange(false);
    }, [onCommit, onOpenChange]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                showCloseButton={false}
                className={cn(
                    "fixed inset-0 z-50 flex h-dvh max-h-[100dvh] w-full max-w-none translate-x-0 translate-y-0 flex-col gap-0 rounded-none border-0 p-0 shadow-none sm:max-w-none",
                    "data-[state=closed]:zoom-out-100 data-[state=open]:zoom-in-100",
                    className,
                )}>
                <DialogTitle className="sr-only">{title}</DialogTitle>
                <DialogDescription className="sr-only">
                    Draw your signature in the white area. Use Done to save or
                    Cancel to close without saving changes.
                </DialogDescription>

                <header className="bg-background flex shrink-0 items-center justify-between gap-3 border-b px-4 py-3">
                    <h2 className="text-foreground truncate text-base font-semibold">
                        {title}
                    </h2>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={disabled}
                        onClick={handleClear}>
                        Clear
                    </Button>
                </header>

                <div
                    ref={containerRef}
                    className={cn(
                        "bg-muted/30 flex min-h-0 flex-1 items-stretch p-2",
                        disabled && "pointer-events-none opacity-50",
                    )}>
                    <div className="relative min-h-0 min-w-0 flex-1 overflow-hidden rounded-md border bg-white">
                        <SignatureCanvas
                            ref={sigRef}
                            {...signaturePadPenDefaults}
                            canvasProps={{
                                className:
                                    "absolute inset-0 h-full w-full touch-none",
                            }}
                            clearOnResize={false}
                        />
                    </div>
                </div>

                <footer
                    className="bg-background flex shrink-0 gap-3 border-t px-4 py-4"
                    style={{
                        paddingBottom:
                            "max(1rem, env(safe-area-inset-bottom, 0px))",
                    }}>
                    <Button
                        type="button"
                        variant="outline"
                        className="flex-1"
                        disabled={disabled}
                        onClick={handleCancel}>
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        className="flex-1"
                        disabled={disabled}
                        onClick={handleDone}>
                        Done
                    </Button>
                </footer>
            </DialogContent>
        </Dialog>
    );
}
