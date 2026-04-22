import {
    SelectableWorkerMetricCard,
    type SelectableWorkerMetricRow,
} from "@/components/dashboard/selectable-worker-metric-card";

type ForeignFullTimeLine = {
    id: string;
    name: string;
    monthlyPay: number | null;
};

export function FullTimeMonthlyPayCard({ rows }: { rows: ForeignFullTimeLine[] }) {
    const metricRows: SelectableWorkerMetricRow[] = rows.map((r) => ({
        id: r.id,
        name: r.name,
        amount: r.monthlyPay ?? 0,
    }));
    return (
        <SelectableWorkerMetricCard
            title="Full Time monthly pay"
            description="Foreign Full Time — total contracted monthly pay"
            rows={metricRows}
        />
    );
}
