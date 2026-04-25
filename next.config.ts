import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    reactCompiler: true,
    serverExternalPackages: ["@sparticuz/chromium"],
    outputFileTracingIncludes: {
        "/api/**/*": ["./node_modules/@sparticuz/chromium/**/*"],
    },
    async redirects() {
        return [
            {
                source: "/dashboard/workers",
                destination: "/dashboard/worker/all",
                permanent: false,
            },
            {
                source: "/dashboard/workers/:path*",
                destination: "/dashboard/worker/:path*",
                permanent: false,
            },
        ];
    },
};

export default nextConfig;
