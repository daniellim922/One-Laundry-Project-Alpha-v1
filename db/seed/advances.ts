/**
 * Advance/loan seed entries.
 * workerIndex references the workers array in workers.ts (0-based).
 * Resolved to workerId when seeding.
 */
export const advances = [
    {
        workerName: "Ding Chun Rong",
        amount: 300,
        status: "Loan" as const,
        dateRequested: "2026-02-10",
        purpose: "Unforeseen medical expenses",

        repaymentTerms: [
            {
                installmentAmt: 100,
                installmentDate: "2026-03-10",
            },
            {
                installmentAmt: 100,
                installmentDate: "2026-03-15",
            },
            {
                installmentAmt: 100,
                installmentDate: "2026-04-10",
            },
        ],
    },
    {
        workerName: "Alvis Ong Thai Ying",
        amount: 200,
        status: "Loan" as const,
        dateRequested: "2026-02-18",
        purpose: "Emergency travel expenses",
        repaymentTerms: [
            {
                installmentAmt: 100,
                installmentDate: "2026-03-18",
            },
            {
                installmentAmt: 100,
                installmentDate: "2026-03-20",
            },
        ],
    },
    {
        workerName: "Lovepreet",
        amount: 150,
        status: "Loan" as const,
        dateRequested: "2026-02-25",
        purpose: "Home renovation",
        repaymentTerms: [
            {
                installmentAmt: 100,
                installmentDate: "2026-03-25",
            },
            {
                installmentAmt: 50,
                installmentDate: "2026-04-10",
            },
        ],
    },
];
