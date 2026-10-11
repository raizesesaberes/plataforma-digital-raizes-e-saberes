"""Reset only the named, synthetic Docker database. Never accepts a remote URL."""
from pathlib import Path
import subprocess
root=Path(__file__).resolve().parents[2]
def run(sql):
 p=subprocess.run(['docker','exec','-i','rs-contract-db','psql','-U','postgres','-v','ON_ERROR_STOP=1'],input=sql,text=True,stdout=subprocess.PIPE,stderr=subprocess.STDOUT)
 if p.returncode:raise RuntimeError(p.stdout[-2000:])
 return p.stdout
for role in ['anon','authenticated','service_role','supabase_admin','supabase_storage_admin','dashboard_user']:
 run(f"do $$begin if not exists(select 1 from pg_roles where rolname='{role}') then execute 'create role {role} nologin';end if;end$$;")
run('drop schema if exists public cascade;create schema public;drop schema if exists auth cascade;drop schema if exists storage cascade;drop schema if exists school_category_private cascade;drop schema if exists contract_operations_private cascade;drop schema if exists extensions cascade;')
boot=(root/'tests/contracts/bootstrap.sql').read_text()
# Roles survive a schema rebuild.
boot='\n'.join(x for x in boot.splitlines() if not x.startswith('create role'))
run(boot)
run((root/'supabase/baselines/20261004_pilot_schema_baseline.sql').read_text())
run((root/'tests/contracts/admin-assert.sql').read_text())
for f in ['20261004231721_content_architecture_phase1_question_entitlements.sql','20261007092231_content_macro_v1_modules.sql','20261011003308_school_content_dynamic_categories_v2.sql','20261011003328_school_content_global_review_v2.sql','20261011003339_school_content_native_question_categories_v2.sql','20261011003351_school_content_category_checkpoint_v2.sql','20261011003404_school_content_protected_adapters_v2.sql']:
 run((root/'supabase/migrations'/f).read_text())
run((root/'supabase/review/contract_operations.sql').read_text())
run((root/'tests/contracts/seed.sql').read_text())
print('Synthetic local database rebuilt; no remote connection.')
