import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        environment: 'jsdom',
        globals: true,
        setupFiles: ['./tests/frontend/setup.ts'],
        dir: './tests/frontend'
    },
    resolve: {
        alias: {
            '@': '/frontend/src',
        },
    },
});
