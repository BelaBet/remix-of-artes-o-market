import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { mcpPlugin } from "@lovable.dev/mcp-js/stacks/supabase/vite";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    mcpPlugin(),
    VitePWA({
      // "prompt" NÃO significa que o usuário precisa clicar: o modo "autoUpdate"
      // força self.skipWaiting() dentro do SW e recarrega a página sozinho, o que
      // descartaria o carrinho (que vive em memória) no meio de uma compra.
      // Com "prompt" o controle fica no PWAUpdater, que atualiza sozinho quando
      // é seguro e só pergunta quando há itens no carrinho.
      registerType: "prompt",
      injectRegister: null, // registramos manualmente em src/pwa.ts
      includeAssets: ["favicon.ico", "favicon.png", "apple-touch-icon.png", "robots.txt"],
      manifest: {
        name: "Feito à Mão — Artesanato Brasileiro",
        short_name: "Feito à Mão",
        description:
          "Marketplace de artesanato brasileiro autoral. Peças únicas, feitas à mão, direto de quem cria.",
        lang: "pt-BR",
        start_url: "/",
        scope: "/",
        display: "standalone",
        orientation: "portrait",
        background_color: "#f7f2ea",
        theme_color: "#f7f2ea",
        categories: ["shopping", "lifestyle"],
        icons: [
          { src: "/pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "/pwa-512x512.png", sizes: "512x512", type: "image/png" },
          {
            src: "/pwa-maskable-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,webp,woff2}"],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: false, // controlado pelo nosso prompt de atualização
        navigateFallback: "index.html",
        // Nunca servir rotas de auth/API a partir do cache.
        navigateFallbackDenylist: [/^\/\.lovable\//, /^\/auth/, /^\/functions\//],
        runtimeCaching: [
          {
            // Chamadas ao Supabase sempre pela rede; cache só como último recurso offline.
            urlPattern: ({ url }) => url.hostname.endsWith(".supabase.co"),
            handler: "NetworkOnly",
          },
          {
            urlPattern: ({ request }) => request.destination === "image",
            handler: "CacheFirst",
            options: {
              cacheName: "imagens",
              expiration: { maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: ({ request }) =>
              request.destination === "font" || request.destination === "style",
            handler: "StaleWhileRevalidate",
            options: { cacheName: "assets-estaticos" },
          },
        ],
      },
      devOptions: {
        enabled: false, // não registrar SW em dev (atrapalha o HMR)
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
