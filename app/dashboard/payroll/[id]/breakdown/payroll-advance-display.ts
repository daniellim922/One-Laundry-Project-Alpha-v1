import { formatEnGbDmyNumericFromCalendar } from "@/utils/time/intl-en-gb";

export { installmentToneClassName as payrollAdvanceStatusBadgeClass } from "@/types/badge-tones";

export function formatPayrollAdvanceDate(d: string | Date): string {
    return formatEnGbDmyNumericFromCalendar(d);
}
