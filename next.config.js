/** @type {import('next').NextConfig} */
const nextConfig = {
  // Bundle mínimo autocontido (server.js + node_modules necessários) — é o
  // formato esperado pela hospedagem Node.js da Hostinger (via Passenger).
  output: "standalone",
  images: {
    remotePatterns: [{ protocol: "http", hostname: "localhost" }],
  },
};
module.exports = nextConfig;
