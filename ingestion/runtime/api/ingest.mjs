import pg from 'pg';
import config from '../deployment.config.json' with {type:'json'};
import {createRuntime} from '../runtime.mjs';
// Only this isolated project's two scoped secret values are read; nothing logged.
const fetch=createRuntime({Pool:pg.Pool,env:process.env,config});
export default {fetch};
