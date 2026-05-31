import type { AttendRecordOutput } from "@/utils/payroll/parse-attendrecord";

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
                <button
                    type="button"
                    onClick={onReset}
                    className="text-primary hover:underline text-sm">
                    Upload a different file
                </button>
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
