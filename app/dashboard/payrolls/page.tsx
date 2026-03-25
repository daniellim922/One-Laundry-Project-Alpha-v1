import { redirect } from "next/navigation";

export default function PayrollsLegacyRedirect() {
    redirect("/dashboard/payroll/all");
}
