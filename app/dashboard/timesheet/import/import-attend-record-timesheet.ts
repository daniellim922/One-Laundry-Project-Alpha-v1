import type { AttendRecordOutput } from "@/utils/payroll/parse-attendrecord";

type ImportAttendRecordTimesheetResponse =
    | {
          ok: true;
          data: {
              imported: number;
              errors?: string[];
          };
      }
    | {
          ok: false;
          error: {
              code: string;
              message: string;
          };
      };

function stripHoursFromAttendRecordPayload(
    data: AttendRecordOutput,
): AttendRecordOutput {
    return {
        attendanceDate: data.attendanceDate,
        tablingDate: data.tablingDate,
        workers: data.workers.map((worker) => ({
            userId: worker.userId,
            name: worker.name,
            dates: worker.dates.map((date) => ({
                dateIn: date.dateIn,
                timeIn: date.timeIn,
                dateOut: date.dateOut,
                timeOut: date.timeOut,
            })),
        })),
    };
}

export async function importAttendRecordTimesheet(
    data: AttendRecordOutput,
): Promise<{ imported: number; errors?: string[] } | { error: string }> {
    try {
        const sanitizedData = stripHoursFromAttendRecordPayload(data);
        const response = await fetch("/api/timesheets/import", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(sanitizedData),
        });

        let body: ImportAttendRecordTimesheetResponse | null = null;
        try {
            body = (await response.json()) as ImportAttendRecordTimesheetResponse;
        } catch {
            body = null;
        }

        if (!response.ok || !body?.ok) {
            return {
                error:
                    body && !body.ok
                        ? body.error.message
                        : "Import failed",
            };
        }

        return body.data;
    } catch {
        return {
            error: "Import failed",
        };
    }
}
