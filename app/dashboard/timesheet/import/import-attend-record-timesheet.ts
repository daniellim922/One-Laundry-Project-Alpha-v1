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

export async function importAttendRecordTimesheet(
    data: AttendRecordOutput,
): Promise<{ imported: number; errors?: string[] } | { error: string }> {
    try {
        const response = await fetch("/api/timesheets/import", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(data),
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
