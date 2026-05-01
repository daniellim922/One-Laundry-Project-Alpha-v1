/** Browser-only: save a successful fetch response body as a downloaded file. */

export async function downloadBlobResponse(
    res: Response,
    filename: string,
): Promise<void> {
    if (!res.ok) {
        throw new Error(`Download failed (${res.status})`);
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}
