type WorkerHoursBulkUpdateInput = {
    updates: Array<{
        workerId: string;
        minimumWorkingHours: number;
    }>;
};

type WorkerHoursBulkUpdateResult = {
    updatedCount: number;
    failed: Array<{
        workerId: string;
        workerName: string;
        error: string;
    }>;
};

type ApiResponse =
    | {
          ok: true;
          data: WorkerHoursBulkUpdateResult;
      }
    | {
          ok: false;
          error: {
              code: string;
              message: string;
          };
      };

export async function updateWorkerMinimumWorkingHours(
    input: WorkerHoursBulkUpdateInput,
): Promise<WorkerHoursBulkUpdateResult | { error: string }> {
    try {
        const response = await fetch("/api/workers/minimum-working-hours", {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(input),
        });

        let body: ApiResponse | null = null;
        try {
            body = (await response.json()) as ApiResponse;
        } catch {
            body = null;
        }

        if (!response.ok || !body?.ok) {
            return {
                error:
                    body && !body.ok
                        ? body.error.message
                        : "Failed to save mass edit. Please try again.",
            };
        }

        return body.data;
    } catch {
        return { error: "Failed to save mass edit. Please try again." };
    }
}
