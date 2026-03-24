import Link from "next/link";
import { notFound } from "next/navigation";

import { BackButton } from "@/components/back-button";
import { Button } from "@/components/ui/button";
import { getAdvanceRequestByIdWithWorker } from "@/lib/advances-queries";
import { Pencil } from "lucide-react";

import { AdvanceRequestView } from "./advance-request-view";

export default async function AdvanceDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const detail = await getAdvanceRequestByIdWithWorker(id);
    if (!detail) {
        notFound();
    }

    return (
        <div
            className="mx-auto w-full max-w-screen-2xl space-y-8"
            data-testid="advance-detail">
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <BackButton href="/dashboard/advance" />
                    <div>
                        <h1 className="text-xl font-semibold tracking-wide uppercase">
                            Advance request
                        </h1>
                        <p className="text-muted-foreground text-sm">
                            Detail for worker {detail.request.workerName}
                        </p>
                    </div>
                </div>
                {detail.request.status === "paid" ? (
                    <Button variant="outline" size="sm" disabled>
                        <Pencil className="h-4 w-4" />
                        Edit
                    </Button>
                ) : (
                    <Button asChild variant="outline" size="sm">
                        <Link
                            href={`/dashboard/advance/${id}/edit`}
                            className="flex items-center gap-2">
                            <Pencil className="h-4 w-4" />
                            Edit
                        </Link>
                    </Button>
                )}
            </div>

            <AdvanceRequestView detail={detail} advanceRequestId={id} />
        </div>
    );
}
