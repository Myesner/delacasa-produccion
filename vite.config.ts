import path from 'path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { inspectAttr } from 'plugin-inspect-react-code'

export default defineConfig(({ command, mode }) => {
  const repository = process.env.GITHUB_REPOSITORY?.split('/')[1] ?? 'delacasa-produccion';
  return {
    base: mode === 'pages' ? `/${repository}/` : '/',
    // Editor inspection is useful locally and is not part of the published app.
    plugins: [...(command === 'serve' ? [inspectAttr()] : []), react()],
    server: { port: 3000 },
    resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  };
});
