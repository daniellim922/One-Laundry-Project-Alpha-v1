import { formatDmyInput } from "@/utils/time/calendar-date";

export function placeCaretAtEnd(el: HTMLElement) {
    const range = document.createRange();
    const sel = window.getSelection();
    range.selectNodeContents(el);
    range.collapse(false);
    sel?.removeAllRanges();
    sel?.addRange(range);
}

export function ContentEditableDateCell(props: {
    rowIndex: number;
    field: "dateIn" | "dateOut";
    value: string;
    invalid: boolean;
    onCommit: (
        rowIndex: number,
        field: "dateIn" | "dateOut",
        value: string,
    ) => void;
}) {
    const { rowIndex, field, value, invalid, onCommit } = props;
    return (
        <div
            contentEditable
            suppressContentEditableWarning
            onInput={(e) => {
                const el = e.currentTarget;
                const formatted = formatDmyInput(el.textContent ?? "");
                if (el.textContent !== formatted) {
                    el.textContent = formatted;
                    placeCaretAtEnd(el);
                }
            }}
            onBlur={(e) =>
                onCommit(rowIndex, field, e.currentTarget.textContent ?? "")
            }
            onPaste={(e) => {
                e.preventDefault();
                const text = e.clipboardData.getData("text/plain");
                const formatted = formatDmyInput(text.replace(/\D/g, ""));
                document.execCommand("insertText", false, formatted);
            }}
            className={`min-w-28 rounded px-2 py-1.5 outline-none focus:ring-2 focus:ring-ring focus:ring-inset ${invalid ? "text-destructive" : ""}`}>
            {value}
        </div>
    );
}
