import { revalidatePath } from "next/cache";

type RevalidationTarget =
    | string
    | {
          path: string;
          type?: "layout" | "page";
      };

export function revalidateTransportPaths(targets: RevalidationTarget[]) {
    for (const target of targets) {
        if (typeof target === "string") {
            revalidatePath(target);
            continue;
        }

        revalidatePath(target.path, target.type);
    }
}
