import { FormPageLayout } from "@/components/form-page-layout";

import { SettleDraftPayrollsPanel } from "@/app/dashboard/payroll/settle-drafts/settle-draft-payrolls-panel";

export default function SettleDraftPayrollsPage() {
    return (
        <FormPageLayout
            title="Settle draft payrolls"
            subtitle="Select Draft payroll runs to settle. After settlement, PDFs can download as a ZIP."
            maxWidthClassName="max-w-screen-2xl">
            <SettleDraftPayrollsPanel />
        </FormPageLayout>
    );
}
