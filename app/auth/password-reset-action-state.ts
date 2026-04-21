export type PasswordResetActionState = {
    status: "idle" | "success" | "error";
    message?: string;
};

export const initialPasswordResetActionState: PasswordResetActionState = {
    status: "idle",
};
