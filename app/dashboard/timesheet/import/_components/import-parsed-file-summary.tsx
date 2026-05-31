import type { AttendRecordOutput } from "@/utils/payroll/parse-attendrecord";

import { Button } from "@/components/ui/button";

export function ImportParsedFileSummary({
    fileName,
    parsedData,
    totalEntries,
    onReset,
}: {
    fileName: string;
    parsedData: AttendRecordOutput;
    totalEntries: number;
    onReset: () => void;
}) {
    return (
        <>
            <div className="flex flex-wrap items-center gap-4">
                <p className="font-medium">{fileName}</p>
                <Button
                    type="button"
                    variant="link"
                    size="sm"
                    onClick={onReset}>
                    Upload a different file
                </Button>
            </div>
            <div className="text-muted-foreground text-sm">
                <p>
                    Attendance period: {parsedData.attendanceDate.startDate} ~{" "}
                    {parsedData.attendanceDate.endDate}
                </p>
                {parsedData.tablingDate && (
                    <p>Tabling date: {parsedData.tablingDate}</p>
                )}
                <p>
                    {parsedData.workers.length} worker
                    {parsedData.workers.length !== 1 ? "s" : ""}, {totalEntries}{" "}
                    entr{totalEntries !== 1 ? "ies" : "y"} total
                </p>
            </div>
        </>
    );
}
