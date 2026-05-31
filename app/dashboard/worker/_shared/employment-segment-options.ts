import { WORKER_SHIFT_PATTERNS } from "@/types/status";

export const EMPLOYMENT_TYPE_SEGMENT_OPTIONS = [
    {
        value: "Full Time" as const,
        label: "Full Time",
        activeClassName:
            "border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/50",
        inactiveHoverClassName:
            "hover:border-emerald-300 hover:bg-emerald-50/50 dark:hover:border-emerald-500/30 dark:hover:bg-emerald-500/10",
    },
    {
        value: "Part Time" as const,
        label: "Part Time",
        activeClassName:
            "border-sky-500 bg-sky-50 text-sky-800 dark:bg-sky-500/20 dark:text-sky-300 dark:border-sky-500/50",
        inactiveHoverClassName:
            "hover:border-sky-300 hover:bg-sky-50/50 dark:hover:border-sky-500/30 dark:hover:bg-sky-500/10",
    },
] as const;

export const EMPLOYMENT_ARRANGEMENT_SEGMENT_OPTIONS = [
    {
        value: "Foreign Worker" as const,
        label: "Foreign Worker",
        activeClassName:
            "border-blue-500 bg-blue-50 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/50",
        inactiveHoverClassName:
            "hover:border-blue-300 hover:bg-blue-50/50 dark:hover:border-blue-500/30 dark:hover:bg-blue-500/10",
    },
    {
        value: "Local Worker" as const,
        label: "Local Worker",
        activeClassName:
            "border-amber-500 bg-amber-50 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/50",
        inactiveHoverClassName:
            "hover:border-amber-300 hover:bg-amber-50/50 dark:hover:border-amber-500/30 dark:hover:bg-amber-500/10",
    },
] as const;

export const SHIFT_PATTERN_SEGMENT_OPTIONS = [
    {
        value: WORKER_SHIFT_PATTERNS[0],
        label: WORKER_SHIFT_PATTERNS[0],
        activeClassName:
            "border-orange-400 bg-orange-50 text-orange-900 dark:bg-orange-500/20 dark:text-orange-200 dark:border-orange-400/70",
        inactiveHoverClassName:
            "hover:border-orange-300 hover:bg-orange-50/50 dark:hover:border-orange-500/35 dark:hover:bg-orange-500/10",
    },
    {
        value: WORKER_SHIFT_PATTERNS[1],
        label: WORKER_SHIFT_PATTERNS[1],
        activeClassName:
            "border-indigo-500 bg-indigo-50 text-indigo-900 dark:bg-indigo-500/25 dark:text-indigo-200 dark:border-indigo-500/55",
        inactiveHoverClassName:
            "hover:border-indigo-300 hover:bg-indigo-50/60 dark:hover:border-indigo-500/35 dark:hover:bg-indigo-500/12",
    },
] as const;
