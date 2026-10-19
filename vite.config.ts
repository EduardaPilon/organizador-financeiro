import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// Rodando sob o Vitest (testes unitários), o plugin de DevTools é dispensável
// e só atrapalha a inicialização do ambiente.
const emTestes = process.env.VITEST === 'true' || process.env.VITEST === '1'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), ...(emTestes ? [] : [vueDevTools()])],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    // Escuta em todas as interfaces (0.0.0.0) para que a porta seja
    // alcançável a partir do Windows pelo encaminhamento de localhost do WSL2.
    host: true,
    port: 5173,
    strictPort: true,
  },
  test: {
    // DOM de mentira (happy-dom) para testar componentes sem navegador.
    environment: 'happy-dom',
    include: ['src/**/*.spec.ts'],
    restoreMocks: true,
    // As telas deste app são testadas por unidade (utils e stores);
    // a validação visual é feita no navegador, não em snapshot.
    clearMocks: true,
  },
})
