import { getWorkersForMassEditWorkingHours } from "./get-workers-for-mass-edit";
import { MassEditWorkingHoursPageClient } from "./mass-edit-page-client";

export default async function MassEditWorkingHoursPage() {
    const workers = await getWorkersForMassEditWorkingHours();

    return <MassEditWorkingHoursPageClient workers={workers} />;
}
