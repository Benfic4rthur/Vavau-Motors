import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({base:process.env.PAGES_BASE||'/',plugins:[react()],build:{outDir:'dist-static',emptyOutDir:true},server:{host:'127.0.0.1',port:5173}});
