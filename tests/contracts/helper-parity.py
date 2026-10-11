"""Compare local exact fixture definitions/ACLs with read-only production metadata.
No authentication context is set, in production or for this metadata-only query.
"""
import json, subprocess
from pathlib import Path
expected=json.loads(Path('tests/contracts/evidence/helper-parity-expected.json').read_text())
query="""select jsonb_agg(jsonb_build_object('proname',p.proname,'definition_md5',md5(pg_get_functiondef(p.oid)),'owner',pg_get_userbyid(p.proowner),'acl',p.proacl::text,'proconfig',p.proconfig) order by p.proname) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('school_content_assert_admin','school_content_managed_grades','school_content_candidates');"""
p=subprocess.run(['docker','exec','-i','rs-contract-db','psql','-XAtq','-U','postgres','-v','ON_ERROR_STOP=1'],input=query,text=True,capture_output=True)
assert p.returncode==0,p.stderr
actual=json.loads(p.stdout)
assert actual==expected['functions'],{'expected':expected['functions'],'actual':actual}
print('PASS production/local helper parity: exact pg_get_functiondef MD5, postgres owner, search_path, jit and ACL for all 3 functions')
print('ASSERT_ADMIN_MD5=af73e3d2a14b425509831b4fa8ef9ca9; ACL=postgres EXECUTE, service_role EXECUTE; no PUBLIC/anon/authenticated EXECUTE')
