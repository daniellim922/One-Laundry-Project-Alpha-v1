export type UpdatePasswordActionState = {
    status: "idle" | "error";
    message?: string;
};

export const initialUpdatePasswordActionState: UpdatePasswordActionState = {
    status: "idle",
};
