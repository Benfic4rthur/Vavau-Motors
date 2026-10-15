// @ts-expect-error Tested JavaScript module, bundled by Vercel.
import {createAdminService} from '../server/admin-service.mjs';
// @ts-expect-error Tested JavaScript module, bundled by Vercel.
import {nodeAdapter} from '../server/node-adapter.mjs';
export default nodeAdapter(createAdminService(process.env));
