import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    root: 'src/',
    publicDir: '../Assets/',
    base: './',
    plugins: [react()],
});
