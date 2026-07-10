/** @type {import('next').NextConfig} */
const nextConfig = {
  // Bundle mínimo autocontido (server.js + node_modules necessários) — é o
  // formato esperado pela hospedagem Node.js da Hostinger (via Passenger).
  output: "standalone",
  images: {
    remotePatterns: [{ protocol: "http", hostname: "localhost" }],
  },
  // O Next.js manda Cache-Control de 1 ano por padrão nessas páginas estáticas;
  // o CDN da Hostinger (hcdn) obedece esse header literalmente e não sabe
  // invalidar após um redeploy — visitantes acabam recebendo HTML antigo
  // apontando para chunks JS/CSS já apagados. Forçar "force-dynamic" para
  // evitar isso não é viável aqui: essa hospedagem compartilhada não aguenta
  // consultar o Prisma a cada requisição (trava com EAGAIN). Então mantemos a
  // página estática (gerada só no build) e apenas sobrescrevemos o header.
  async headers() {
    const noStore = [{ key: "Cache-Control", value: "no-store" }];
    return [
      { source: "/login", headers: noStore },
      { source: "/agendar", headers: noStore },
      { source: "/agendar/escolher", headers: noStore },
    ];
  },
};
module.exports = nextConfig;
