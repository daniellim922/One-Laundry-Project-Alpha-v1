import type { InsertFeature } from "@/db/tables/auth/featuresTable";
import type { InsertRole } from "@/db/tables/auth/rolesTable";

export const FEATURES: InsertFeature[] = [
    { name: "Home" },
    { name: "Workers" },
    { name: "Timesheet" },
    { name: "Payroll" },
    { name: "Expenses" },
    { name: "IAM (Identity and Access Management)" },
];
export const ROLES: InsertRole[] = [{ name: "Admin" }];

export const ROLE_PERMISSIONS = [
    {
        role: "Admin",
        features: [
            {
                featureName: "Home",
                create: true,
                read: true,
                update: true,
                delete: true,
            },
            {
                featureName: "Workers",
                create: true,
                read: true,
                update: true,
                delete: true,
            },
            {
                featureName: "Timesheet",
                create: true,
                read: true,
                update: true,
                delete: true,
            },
            {
                featureName: "Payroll",
                create: true,
                read: true,
                update: true,
                delete: true,
            },
            {
                featureName: "Expenses",
                create: true,
                read: true,
                update: true,
                delete: true,
            },
            {
                featureName: "IAM (Identity and Access Management)",
                create: true,
                read: true,
                update: true,
                delete: true,
            },
        ],
    },
];
