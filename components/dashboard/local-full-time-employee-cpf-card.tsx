import {
    SelectableWorkerMetricCard,
    type SelectableWorkerMetricRow,
} from "@/components/dashboard/selectable-worker-metric-card";

type LocalFullTimeLine = {
    id: string;
    name: string;
    cpf: number | null;
};

export function LocalFullTimeEmployeeCpfCard({
    rows,
}: {
    rows: LocalFullTimeLine[];
}) {
    const metricRows: SelectableWorkerMetricRow[] = rows.map((r) => ({
        id: r.id,
        name: r.name,
        amount: r.cpf ?? 0,
    }));
    return (
        <SelectableWorkerMetricCard
            title="Local Full Time employee CPF"
            description="Local Full Time — total employee CPF on employment"
            rows={metricRows}
        />
    );
}
