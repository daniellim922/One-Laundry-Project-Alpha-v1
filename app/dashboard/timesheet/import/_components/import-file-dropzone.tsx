import type * as React from "react";
import { Upload } from "lucide-react";

export function ImportFileDropzone({
    isDragging,
    onDrop,
    onDragOver,
    onDragLeave,
    onFileInputChange,
}: {
    isDragging: boolean;
    onDrop: (e: React.DragEvent) => void;
    onDragOver: (e: React.DragEvent) => void;
    onDragLeave: (e: React.DragEvent) => void;
    onFileInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
    return (
        <label
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            className={`
                flex min-h-[200px] cursor-pointer flex-col items-center justify-center
                gap-3 rounded-lg border-2 border-dashed transition-colors
                hover:border-primary/50 hover:bg-muted/50
                ${isDragging ? "border-primary bg-muted/50" : "border-muted-foreground/25"}
            `}>
            <input
                type="file"
                accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                onChange={onFileInputChange}
                className="sr-only"
            />
            <Upload className="text-muted-foreground size-10" />
            <span className="text-muted-foreground text-sm">
                {isDragging
                    ? "Drop file here"
                    : "Drag and drop or click to upload"}
            </span>
            <span className="text-muted-foreground text-xs">.xlsx, .xls</span>
        </label>
    );
}
