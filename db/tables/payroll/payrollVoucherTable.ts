import {
    pgTable,
    uuid,
    text,
    timestamp,
    real,
} from "drizzle-orm/pg-core";

export const payrollVoucherTable = pgTable("payroll_voucher", {
    id: uuid().primaryKey().defaultRandom(),
    voucherNumber: real("voucher_number"),
    employmentType: text("employment_type"),
    employmentArrangement: text("employment_arrangement"),
    monthlyPay: real("monthly_pay"),
    minimumWorkingHours: real("minimum_working_hours"),
    totalHoursWorked: real("total_hours_worked"),
    overtimeHours: real("overtime_hours"),
    hourlyRate: real("hourly_rate"),
    overtimePay: real("overtime_pay"),

    restDays: real("rest_days"),
    restDayRate: real("rest_day_rate"),
    restDayPay: real("rest_day_pay"),

    cpf: real("cpf"),
    totalPay: real("total_pay"),

    paymentMethod: text("payment_method"),
    payNowPhone: text("paynow_phone"),
    bankAccountNumber: text("bank_account_number"),

    createdAt: timestamp("created_at", { withTimezone: false })
        .notNull()
        .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: false })
        .notNull()
        .defaultNow(),
});

export type SelectPayrollVoucher = typeof payrollVoucherTable.$inferSelect;
export type InsertPayrollVoucher = typeof payrollVoucherTable.$inferInsert;
