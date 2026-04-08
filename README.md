This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Worker Test Commands

```bash
npm run test:unit:worker
npm run test:integration:worker
npm run test:e2e:worker
```

`test:e2e:worker` is deterministic and assumes seeded data/users are present. Run `npm run db:seed` first.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Payroll Overlap Migration Diagnostics

The payroll table enforces no overlapping payroll periods for the same worker.
If migration `0017_payroll_worker_period_overlap_exclusion.sql` fails, run:

```sql
SELECT
  p1.id AS payroll_id_1,
  p2.id AS payroll_id_2,
  w.name AS worker_name,
  p1.period_start AS payroll_1_start,
  p1.period_end AS payroll_1_end,
  p2.period_start AS payroll_2_start,
  p2.period_end AS payroll_2_end,
  p1.status AS payroll_1_status,
  p2.status AS payroll_2_status
FROM payroll p1
JOIN payroll p2
  ON p1.worker_id = p2.worker_id
 AND p1.id < p2.id
 AND daterange(p1.period_start, p1.period_end, '[]')
     && daterange(p2.period_start, p2.period_end, '[]')
JOIN worker w ON w.id = p1.worker_id
ORDER BY w.name, p1.period_start, p2.period_start;
```

Manual cleanup default: keep `Settled` payroll records over `Draft` when resolving overlaps, unless finance confirms the settled row is incorrect.
