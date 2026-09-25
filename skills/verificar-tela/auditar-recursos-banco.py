"""Inventario estatico das leituras/RPCs literais versus catalogo local.
Nao prova permissoes, contratos de colunas ou consultas construidas dinamicamente.
Nao imprime dados de clientes nem credenciais.
"""
from pathlib import Path
import re, subprocess, json

paths = list(Path('src/views').rglob('*.tsx')) + list(Path('app/api').rglob('*.ts')) + list(Path('src/servidor').rglob('*.ts'))
refs, rpcs = {}, {}
for path in paths:
    source = path.read_text(encoding='utf-8')
    for name in re.findall(r'''["`']([a-z][a-z0-9_]*)\?select=''', source):
        refs.setdefault(name, []).append(str(path))
    for name in re.findall(r'''chamarFuncao(?:<[^>]*>)?\(\s*["']([a-z][a-z0-9_]*)''', source):
        rpcs.setdefault(name, []).append(str(path))
query = "select json_build_object('relations',(select json_agg(relname) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public'),'functions',(select json_agg(proname) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public'))"
catalog = json.loads(subprocess.check_output(['docker','exec','supabase_db_Nicolas','psql','-U','postgres','-d','postgres','-Atc',query], text=True))
result = dict(relations=len(refs), rpcs=len(rpcs), missing_relations=sorted(set(refs)-set(catalog['relations'])), missing_rpcs=sorted(set(rpcs)-set(catalog['functions'])), relation_files=refs, rpc_files=rpcs)
Path('skills/verificar-tela/capturas/auditoria-integracao.json').write_text(json.dumps(result,indent=2),encoding='utf-8')
print(json.dumps({k:v for k,v in result.items() if not k.endswith('_files')}))
