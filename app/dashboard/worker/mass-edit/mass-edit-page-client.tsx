"use client";

import { FormPageLayout } from "@/components/form-page-layout";

import {
    MassEditWorkingHoursPanel,
    type WorkerForMassEdit,
} from "./mass-edit-working-hours-panel";

export function MassEditWorkingHoursPageClient({
    workers,
}: {
    workers: WorkerForMassEdit[];
}) {
    return (
        <FormPageLayout
            title="Mass edit working hours"
            subtitle="Select workers and set their minimum working hours. Only Active Full Time Foreign Workers are shown."
            maxWidthClassName="max-w-screen-2xl">
            <MassEditWorkingHoursPanel workers={workers} />
        </FormPageLayout>
    );
}
