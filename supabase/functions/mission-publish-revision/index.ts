import {createHandler} from './handler.ts';
import {validateRevision} from './validate.ts';
Deno.serve(createHandler({url:Deno.env.get('SUPABASE_URL')??'',anonKey:Deno.env.get('SUPABASE_ANON_KEY')??'',serviceKey:Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')??''},fetch,validateRevision));
