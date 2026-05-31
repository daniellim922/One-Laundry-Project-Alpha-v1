import { placeCaretAtEnd } from "./content-editable-date-cell";

/** Enforce HH:MM format as user types - digits only, auto-insert colon */
function formatTimeInput(raw: string): string {
    const digits = raw.replace(/\D/g, "").slice(0, 4);
    if (digits.length <= 2) return digits;
    return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

export function ContentEditableTimeCell(props: {
    rowIndex: number;
    field: "timeIn" | "timeOut";
    displayText: string;
    invalid: boolean;
    onCommit: (
        rowIndex: number,
        field: "timeIn" | "timeOut",
        value: string,
    ) => void;
    /** Time-out column: em dash placeholder and blur normalization. */
    emptyPlaceholderEmDash?: boolean;
}) {
    const {
        rowIndex,
        field,
        displayText,
        invalid,
        onCommit,
        emptyPlaceholderEmDash = false,
    } = props;

    return (
        <div
            contentEditable
            suppressContentEditableWarning
            onInput={(e) => {
                const el = e.currentTarget;
                if (emptyPlaceholderEmDash) {
                    const raw = (el.textContent ?? "").replace(/—/g, "");
                    const formatted = raw === "" ? "" : formatTimeInput(raw);
                    if (el.textContent !== formatted) {
                        el.textContent = formatted || "—";
                        if (formatted) placeCaretAtEnd(el);
                    }
                } else {
                    const formatted = formatTimeInput(el.textContent ?? "");
                    if (el.textContent !== formatted) {
                        el.textContent = formatted;
                        placeCaretAtEnd(el);
                    }
                }
            }}
            onBlur={(e) => {
                const v = (e.currentTarget.textContent ?? "").trim();
                if (emptyPlaceholderEmDash) {
                    onCommit(rowIndex, field, v === "—" ? "" : v);
                } else {
                    onCommit(rowIndex, field, v);
                }
            }}
            onPaste={(e) => {
                e.preventDefault();
                const text = e.clipboardData.getData("text/plain");
                const formatted = formatTimeInput(text.replace(/\D/g, ""));
                document.execCommand("insertText", false, formatted);
            }}
            className={`min-w-20 rounded px-2 py-1.5 outline-none focus:ring-2 focus:ring-ring focus:ring-inset ${invalid ? "text-destructive" : ""}`}>
            {displayText}
        </div>
    );
}
