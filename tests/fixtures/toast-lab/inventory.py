"""Regenerate the searchable toast call-site snapshot; no service code executes."""
from pathlib import Path
import re, json, subprocess
root = Path(__file__).resolve().parents[3]
rows = []
for p in sorted((root / 'src').rglob('*')):
    if p.suffix not in ('.ts', '.tsx') or '.test.' in p.name or 'testing' in p.parts: continue
    s = p.read_text()
    if p.name == 'Toast.tsx': continue
    aliases = re.findall(r'(\w+)\s*=\s*(?:useToastNotification|useMediaActionNotification)\(\)', s)
    pattern = r'<ToastNotice\b'
    if aliases: pattern += r'|\b(?:' + '|'.join(aliases) + r')\('
    for m in re.finditer(pattern, s):
        line = s[:m.start()].count('\n') + 1
        lines = s[m.start():].splitlines()[:22]
        rows.append(dict(file=str(p.relative_to(root)), line=line, kind='notice' if m.group().startswith('<') else 'feedback', source='\n'.join(lines)))
out = dict(commit=subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True).strip(), entries=rows)
(root/'tests/fixtures/toast-lab/inventory.json').write_text(json.dumps(out,indent=2)+'\n')
print(f'{len(rows)} call sites in {len(set(r["file"] for r in rows))} files')
