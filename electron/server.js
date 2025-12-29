const express = require("express");
const path = require("path");
const { createProxyMiddleware } = require("http-proxy-middleware");

/**
 * Servidor local embutido:
 * - Serve /public (frontend)
 * - Faz proxy /pp -> https://api.prayerpulse.io (evita CORS)
 *
 * @param {number} port 0 = porta aleatória
 * @returns {Promise<{server: import("http").Server, port: number}>}
 */
function startServer(port = 0) {
  return new Promise((resolve, reject) => {
    const app = express();

    // Proxy do seu frontend: /pp/...
    app.use(
      "/pp",
      createProxyMiddleware({
        target: "https://api.prayerpulse.io",
        changeOrigin: true,
        secure: true,
        pathRewrite: (p) => p.replace(/^\/pp/, ""),
        onProxyRes(proxyRes) {
          // remove CORS quebrado do upstream (ex.: "*, *")
          delete proxyRes.headers["access-control-allow-origin"];
          delete proxyRes.headers["access-control-allow-credentials"];
        },
      })
    );

    const publicDir = path.join(__dirname, "..", "public");
    app.use(express.static(publicDir));

    app.get("*", (_, res) => {
      res.sendFile(path.join(publicDir, "index.html"));
    });

    const server = app.listen(port, "127.0.0.1", () => {
      const address = server.address();
      resolve({ server, port: address.port });
    });

    server.on("error", reject);
  });
}

module.exports = { startServer };
