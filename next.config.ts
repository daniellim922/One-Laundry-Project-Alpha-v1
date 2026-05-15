import type { NextConfig } from "next";

const securityHeaders = [
    {
        key: "X-Content-Type-Options",
        value: "nosniff",
    },
    {
        key: "Referrer-Policy",
        value: "strict-origin-when-cross-origin",
    },
    {
        key: "X-Frame-Options",
        value: "DENY",
    },
    {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=()",
    },
    ...(process.env.NODE_ENV === "production"
        ? [
              {
                  key: "Strict-Transport-Security",
                  value: "max-age=31536000; includeSubDomains",
              },
          ]
        : []),
];

const nextConfig: NextConfig = {
    reactCompiler: true,
    async headers() {
        return [
            {
                source: "/:path*",
                headers: securityHeaders,
            },
        ];
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
