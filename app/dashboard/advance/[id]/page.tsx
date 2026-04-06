import { redirect } from "next/navigation";
import type { StepProgressItem } from "@/components/ui/step-progress-panel";

interface PageProps {
    params: Promise<{ id: string }>;
}

export function getAdvanceStepItems(advanceRequestId: string): StepProgressItem[] {
    return [
        {
            id: 1,
            label: "Advance Breakdown",
            href: `/dashboard/advance/${advanceRequestId}/breakdown`,
        },
        {
            id: 2,
            label: "Summary & Download",
            href: `/dashboard/advance/${advanceRequestId}/summary`,
        },
    ];
}

export default async function AdvanceDetailPage({ params }: PageProps) {
    const { id } = await params;
    redirect(`/dashboard/advance/${id}/breakdown`);
}
