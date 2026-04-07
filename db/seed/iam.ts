import type { InsertFeature } from "@/db/tables/auth/featuresTable";
import type { InsertRole } from "@/db/tables/auth/rolesTable";

export const FEATURES: InsertFeature[] = [
    { name: "Home" },
    { name: "Workers" },
    { name: "Timesheet" },
    { name: "Payroll" },
    { name: "Expenses" },
    { name: "Advance" },
    { name: "IAM (Identity and Access Management)" },
];
export const ROLES: InsertRole[] = [
    { name: "Admin" },
    { name: "Workers Read Only" },
    { name: "Workers Create Only" },
    { name: "Workers Update Only" },
];

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
                featureName: "Advance",
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
    {
        role: "Workers Read Only",
        features: [
            {
                featureName: "Home",
                create: false,
                read: true,
                update: false,
                delete: false,
            },
            {
                featureName: "Workers",
                create: false,
                read: true,
                update: false,
                delete: false,
            },
        ],
    },
    {
        role: "Workers Create Only",
        features: [
            {
                featureName: "Home",
                create: false,
                read: true,
                update: false,
                delete: false,
            },
            {
                featureName: "Workers",
                create: true,
                read: true,
                update: false,
                delete: false,
            },
        ],
    },
    {
        role: "Workers Update Only",
        features: [
            {
                featureName: "Home",
                create: false,
                read: true,
                update: false,
                delete: false,
            },
            {
                featureName: "Workers",
                create: false,
                read: true,
                update: true,
                delete: false,
            },
        ],
    },
];
