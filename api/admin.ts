import {createAdminService} from '../server/admin-service.mjs';
import {nodeAdapter} from '../server/node-adapter.mjs';
export default nodeAdapter(createAdminService(process.env));
