import html2canvas from "html2canvas-pro";
import { jsPDF } from "jspdf";

function createA4Pdf(): jsPDF {
    return new jsPDF({
        orientation: "p",
        unit: "mm",
        format: "a4",
    });
}

function getA4PageSizeMm(pdf: jsPDF): { pageWidth: number; pageHeight: number } {
    return {
        pageWidth: pdf.internal.pageSize.getWidth(),
        pageHeight: pdf.internal.pageSize.getHeight(),
    };
}

function addCanvasAsSinglePageImage(opts: {
    pdf: jsPDF;
    canvas: HTMLCanvasElement;
    pageWidth: number;
    pageHeight: number;
}) {
    const { pdf, canvas, pageWidth, pageHeight } = opts;
    const imgData = canvas.toDataURL("image/png");

    // Fit-to-page while preserving aspect ratio.
    let imgWidth = pageWidth;
    let imgHeight = (canvas.height * imgWidth) / canvas.width;
    if (imgHeight > pageHeight) {
        const scale = pageHeight / imgHeight;
        imgWidth *= scale;
        imgHeight *= scale;
    }

    const x = (pageWidth - imgWidth) / 2;
    const y = 0;
    pdf.addImage(imgData, "PNG", x, y, imgWidth, imgHeight, undefined, "FAST");
}

function formatDateForFilename(dateIso: string): string {
    const d = new Date(dateIso + "T00:00:00");
    return d.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    });
}

function safeFilenamePart(s: string): string {
    return s.replace(/[/\\:*?"<>|]/g, "-").trim();
}

export async function downloadPayrollSummaryPdf(opts: {
    element: HTMLElement;
    workerName: string;
    periodStart: string;
    periodEnd: string;
}): Promise<void> {
    const { element, workerName, periodStart, periodEnd } = opts;

    // Ensure fonts are fully loaded so canvas text matches UI.
    if (document.fonts?.ready) {
        await document.fonts.ready;
    }

    const periodStartForTitle = formatDateForFilename(periodStart);
    const periodEndForTitle = formatDateForFilename(periodEnd);
    const filename = `${safeFilenamePart(workerName)} - ${periodStartForTitle}-${periodEndForTitle}.pdf`;
    const canvas = await html2canvas(element, {
        backgroundColor: "#ffffff",
        scale: Math.max(2, Math.min(3, window.devicePixelRatio || 2)),
        useCORS: true,
    });

    // Preserve existing behavior for legacy call sites: allow multi-page slicing.
    const imgData = canvas.toDataURL("image/png");
    const pdf = createA4Pdf();
    const { pageWidth, pageHeight } = getA4PageSizeMm(pdf);

    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let y = 0;
    pdf.addImage(imgData, "PNG", 0, y, imgWidth, imgHeight, undefined, "FAST");

    let remaining = imgHeight - pageHeight;
    while (remaining > 0) {
        pdf.addPage();
        y = -((imgHeight - remaining) as number);
        pdf.addImage(imgData, "PNG", 0, y, imgWidth, imgHeight, undefined, "FAST");
        remaining -= pageHeight;
    }

    pdf.save(filename);
}

export async function downloadPayrollVoucherAndTimesheetPdf(opts: {
    voucherElement: HTMLElement;
    timesheetElement: HTMLElement;
    workerName: string;
    periodStart: string;
    periodEnd: string;
}): Promise<void> {
    const { voucherElement, timesheetElement, workerName, periodStart, periodEnd } =
        opts;

    if (document.fonts?.ready) {
        await document.fonts.ready;
    }

    const periodStartForTitle = formatDateForFilename(periodStart);
    const periodEndForTitle = formatDateForFilename(periodEnd);
    const filename = `${safeFilenamePart(workerName)} - ${periodStartForTitle}-${periodEndForTitle}.pdf`;

    const commonCanvasOpts = {
        backgroundColor: "#ffffff",
        scale: Math.max(2, Math.min(3, window.devicePixelRatio || 2)),
        useCORS: true,
    } as const;

    const [voucherCanvas, timesheetCanvas] = await Promise.all([
        html2canvas(voucherElement, commonCanvasOpts),
        html2canvas(timesheetElement, commonCanvasOpts),
    ]);

    const pdf = createA4Pdf();
    const { pageWidth, pageHeight } = getA4PageSizeMm(pdf);

    // Page 1: voucher (force single page by fit-to-page).
    addCanvasAsSinglePageImage({
        pdf,
        canvas: voucherCanvas,
        pageWidth,
        pageHeight,
    });

    // Page 2: timesheet (must fit entirely on one page).
    pdf.addPage();
    addCanvasAsSinglePageImage({
        pdf,
        canvas: timesheetCanvas,
        pageWidth,
        pageHeight,
    });

    pdf.save(filename);
}

