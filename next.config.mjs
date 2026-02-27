/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: "/processor",
  transpilePackages: ["@alpha/ui", "@alpha/sdk"],
};

export default nextConfig;
