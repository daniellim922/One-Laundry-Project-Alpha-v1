export type DashboardNavSubFeature = {
    name: string;
    url: string;
};

export type DashboardNavIconName =
    | "Home"
    | "Worker"
    | "Timesheet"
    | "Payroll"
    | "Expenses"
    | "Advance";

export type DashboardNavFeature = {
    name: string;
    url: string;
    description: string[];
    subFeatures: DashboardNavSubFeature[];
    iconName: DashboardNavIconName;
};

export const DASHBOARD_NAV_FEATURES: DashboardNavFeature[] = [
    {
        name: "Home",
        url: "/dashboard",
        description: [
            "This should display an overview summary of the dashboard using charts from Shadcn UI",
            "It should surface key metrics and shortcuts into the main operational areas",
        ],
        subFeatures: [],
        iconName: "Home",
    },
    {
        name: "Worker",
        url: "/dashboard/worker",
        description: [
            "This should display an overview summary of all workers using charts from Shadcn UI",
            "It should also have quick actions to add a new worker or view all workers",
        ],
        subFeatures: [
            { name: "All workers", url: "/dashboard/worker/all" },
            { name: "New worker", url: "/dashboard/worker/new" },
            {
                name: "Mass edit working hours",
                url: "/dashboard/worker/mass-edit",
            },
        ],
        iconName: "Worker",
    },
    {
        name: "Timesheet",
        url: "/dashboard/timesheet",
        description: [
            "This should display an overview summary of all timesheets using charts from Shadcn UI",
            "It should also have quick actions to import timesheets or view all timesheets",
        ],
        subFeatures: [
            { name: "All timesheets", url: "/dashboard/timesheet/all" },
            { name: "New timesheet", url: "/dashboard/timesheet/new" },
            { name: "Import timesheets", url: "/dashboard/timesheet/import" },
        ],
        iconName: "Timesheet",
    },
    {
        name: "Advance",
        url: "/dashboard/advance",
        description: [
            "This should display an overview summary of salary advance requests using charts from Shadcn UI",
            "It should highlight pending and recent advances and link to create or review requests",
        ],
        subFeatures: [
            { name: "All advances", url: "/dashboard/advance/all" },
            { name: "New advance", url: "/dashboard/advance/new" },
        ],
        iconName: "Advance",
    },
    {
        name: "Payroll",
        url: "/dashboard/payroll",
        description: [
            "This should display an overview summary of payroll runs using charts from Shadcn UI",
            "It should also have quick actions to generate payroll or view all payrolls",
        ],
        subFeatures: [
            { name: "All payrolls", url: "/dashboard/payroll/all" },
            { name: "New payroll", url: "/dashboard/payroll/new" },
            {
                name: "Public holidays",
                url: "/dashboard/payroll/public-holidays",
            },
            {
                name: "Download payrolls",
                url: "/dashboard/payroll/download-payrolls",
            },
            { name: "Settle drafts", url: "/dashboard/payroll/settle-drafts" },
        ],
        iconName: "Payroll",
    },
    {
        name: "Expenses",
        url: "/dashboard/expenses",
        description: [
            "This should display an overview summary of expenses using charts from Shadcn UI",
            "It should also have quick actions to add an expense or view all expenses",
        ],
        subFeatures: [
            { name: "All expenses", url: "/dashboard/expenses/all" },
            { name: "Add expense", url: "/dashboard/expenses/new" },
        ],
        iconName: "Expenses",
    },
];
