import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';
import checker from 'vite-plugin-checker';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    checker({
      overlay: false,
      vueTsc: {
        tsconfigPath: './tsconfig.app.json',
      },
    }),
  ],
  server: {
    host: '0.0.0.0',
  },
});
