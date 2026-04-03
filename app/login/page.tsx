import { LoginForm } from "./login-form";
import { sanitizeDashboardReturnUrl } from "@/utils/auth/return-url";

type PageProps = {
    searchParams: Promise<{ next?: string | string[] }>;
};

export default async function LoginPage({ searchParams }: PageProps) {
    const sp = await searchParams;
    const raw = sp?.next;
    const nextParam = Array.isArray(raw) ? raw[0] : raw;
    const afterLoginPath = sanitizeDashboardReturnUrl(nextParam);

    return <LoginForm afterLoginPath={afterLoginPath} />;
}
