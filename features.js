const sidebarLayoutFeatures = [
    {
        name: "Home",
        url: "/dashboard",
        description: [
            "This should display an overview summary of the dashboard using charts from Shadcn UI",
            "It should surface key metrics and shortcuts into the main operational areas",
        ],
        subFeatures: [],
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
        ],
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
        ],
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
    },
    {
        name: "IAM",
        url: "/dashboard/iam",
        description: [
            "This should display an overview of identity and access using charts from Shadcn UI where helpful",
            "It should provide quick access to manage users, roles, and permissions",
        ],
        subFeatures: [{ name: "Users & Roles", url: "/dashboard/iam/roles" }],
    },
];
