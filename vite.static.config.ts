import {defineConfig,loadEnv} from 'vite';
import react from '@vitejs/plugin-react';
import {productSchema} from './app/lib/product';
// @ts-expect-error Development-only adapter.
import {LocalStore} from './server/local-store.mjs';
// @ts-expect-error Shared, tested server module.
import {createAdminService} from './server/admin-service.mjs';
// @ts-expect-error Shared, tested Node adapter.
import {nodeAdapter} from './server/node-adapter.mjs';
export default defineConfig(({mode})=>{
 const env={...process.env,...loadEnv(mode,process.cwd(),'')};
 return {base:process.env.PAGES_BASE||'/',plugins:[react(),{name:'admin-local-api',configureServer(server){if(!env.ADMIN_INITIAL_PASSWORD_HASH)return;const handle=nodeAdapter(createAdminService(env,new LocalStore(),productSchema));server.middlewares.use((req,res,next)=>{if(req.url?.startsWith('/api/admin'))handle(req,res);else next();});}}],build:{outDir:'dist-static',emptyOutDir:true,rollupOptions:{input:{site:'index.html',admin:'admin.html'}}},server:{host:'127.0.0.1',port:5173}};
});
