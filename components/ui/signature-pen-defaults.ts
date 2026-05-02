import type { SignatureCanvasProps } from "react-signature-canvas";

/** Shared stroke options for inline and fullscreen pads (signature_pad). Equal min/max yields fixed line width in CSS pixels. */
export const signaturePadPenDefaults: Pick<
    SignatureCanvasProps,
    "penColor" | "minWidth" | "maxWidth" | "minDistance"
> = {
    penColor: "black",
    minWidth: 2,
    maxWidth: 2,
    minDistance: 3,
} as const;
