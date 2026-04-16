import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(({mode}) => {
  const isProd = mode === 'production';

  return {
    base: isProd ? './' : '/',
    plugins: [react(), tailwindcss()],
    define: {
      __AMP_DEV__: !isProd,
    },
    resolve: { alias: { '@': path.resolve(__dirname, './src') } },
    ...(isProd && {
      build: {
        outDir: 'resources',
        emptyOutDir: true,
        assetsDir: 'assets',
        rollupOptions: {
          output: {
            manualChunks: {
              // Core React
              react: ["react", "react-dom"],

              // Heavy UI libs
              xterm: ["@xterm/xterm", "@xterm/addon-fit"],
              xyflow: ["@xyflow/react"],

              // Charts
              recharts: ["recharts"],

              // Icons
              lucide: ["lucide-react"],

              // Form validation
              forms: ["react-hook-form", "@hookform/resolvers", "zod"],
            },
          }
        }
      },
    }),
  };
});
