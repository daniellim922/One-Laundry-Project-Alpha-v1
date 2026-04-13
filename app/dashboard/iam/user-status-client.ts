type ApiResponse =
    | {
          ok: true;
          data: {
              userId: string;
              banned: boolean;
          };
      }
    | {
          ok: false;
          error: {
              code: string;
              message: string;
          };
      };

export async function updateIamUserStatus(input: {
    userId: string;
    banned: boolean;
    reason?: string;
}): Promise<{ error?: string }> {
    try {
        const response = await fetch(`/api/iam/users/${input.userId}/status`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                banned: input.banned,
                reason: input.reason,
            }),
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
                        : "Failed to update user status.",
            };
        }

        return {};
    } catch {
        return { error: "Failed to update user status." };
    }
}
