import { FormPageLayout } from "@/components/form-page-layout";

import { DownloadPayrollsPanel } from "@/app/dashboard/payroll/download-payrolls/download-payrolls-panel";

export default function DownloadPayrollsPage() {
    return (
        <FormPageLayout
            title="Download payrolls"
            subtitle="Choose payroll runs to bundle as a ZIP of PDF summaries."
            maxWidthClassName="max-w-screen-2xl">
            <DownloadPayrollsPanel />
        </FormPageLayout>
    );
}
