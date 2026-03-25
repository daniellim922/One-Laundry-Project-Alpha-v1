import { redirect } from "next/navigation";

export default function TimesheetsLegacyRedirect() {
    redirect("/dashboard/timesheet/all");
}
