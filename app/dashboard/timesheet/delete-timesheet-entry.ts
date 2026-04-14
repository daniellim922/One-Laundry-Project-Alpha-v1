type DeleteTimesheetEntryResponse =
    | {
          ok: true;
          data: {
              success: true;
          };
      }
    | {
          ok: false;
          error: {
              code: string;
              message: string;
          };
      };

export async function deleteTimesheetEntry(
    id: string,
): Promise<{ success: true } | { error: string }> {
    try {
        const response = await fetch(`/api/timesheets/${id}`, {
            method: "DELETE",
        });

        let body: DeleteTimesheetEntryResponse | null = null;
        try {
            body = (await response.json()) as DeleteTimesheetEntryResponse;
        } catch {
            body = null;
        }

        if (!response.ok || !body?.ok) {
            return {
                error:
                    body && !body.ok
                        ? body.error.message
                        : "Failed to delete timesheet entry. Please try again.",
            };
        }

        return body.data;
    } catch {
        return {
            error: "Failed to delete timesheet entry. Please try again.",
        };
    }
}
