/**
 * Advance/loan seed entries.
 * workerIndex references the workers array in workers.ts (0-based).
 * Resolved to workerId when seeding.
 */
export const advances = [
    {
        workerIndex: 2,
        amount: 300,
        status: "paid" as const,
        loanDate: "2025-02-10",
        repaymentDate: "2025-03-10",
    },
    {
        workerIndex: 5,
        amount: 200,
        status: "paid" as const,
        loanDate: "2025-02-18",
        repaymentDate: "2025-03-18",
    },
    {
        workerIndex: 9,
        amount: 150,
        status: "paid" as const,
        loanDate: "2025-02-25",
        repaymentDate: "2025-03-25",
    },
    {
        workerIndex: 0,
        amount: 500,
        status: "loan" as const,
        loanDate: "2025-03-03",
        repaymentDate: "2025-04-03",
    },
    {
        workerIndex: 14,
        amount: 250,
        status: "loan" as const,
        loanDate: "2025-03-05",
        repaymentDate: "2025-04-05",
    },
    {
        workerIndex: 7,
        amount: 400,
        status: "paid" as const,
        loanDate: "2025-02-14",
        repaymentDate: "2025-03-14",
    },
    {
        workerIndex: 20,
        amount: 100,
        status: "loan" as const,
        loanDate: "2025-03-12",
        repaymentDate: "2025-04-12",
    },
    {
        workerIndex: 3,
        amount: 350,
        status: "loan" as const,
        loanDate: "2025-03-17",
        repaymentDate: "2025-04-17",
    },
    {
        workerIndex: 11,
        amount: 200,
        status: "paid" as const,
        loanDate: "2025-02-20",
        repaymentDate: "2025-03-20",
    },
    {
        workerIndex: 25,
        amount: 450,
        status: "loan" as const,
        loanDate: "2025-03-08",
        repaymentDate: "2025-04-08",
    },
];
