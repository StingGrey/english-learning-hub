/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  images: { unoptimized: true },
  basePath: "/english-learning-hub",
  trailingSlash: true,
};

module.exports = nextConfig;
