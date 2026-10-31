"""Validate discoverable project skills and repository-local instruction links."""
import argparse,os,re,sys
from pathlib import Path
from urllib.parse import unquote,urlsplit
import yaml
NAME=re.compile(r'^[a-z0-9]+(?:-[a-z0-9]+)*$')
LINK=re.compile(r'(?<!!)\[[^\]]+\]\(([^)]+)\)')
ALLOWED={'name','description','license','allowed-tools','metadata'}

def instruction_files(root):
    found=[]
    for directory,dirs,files in os.walk(root):
        parent=Path(directory)
        dirs[:]=[d for d in dirs if not d.startswith('.venv') and d not in {'.git','node_modules','local','__pycache__','target','logs','.airflow'} and not (parent==root and d=='data')]
        if 'AGENTS.md' in files:found.append(parent/'AGENTS.md')
    found.extend((root/'.agents/skills').glob('*/SKILL.md'))
    found.extend(p for p in (root/'CONTRIBUTING.md',root/'.github/pull_request_template.md') if p.exists())
    return sorted(set(found))

def validate(root):
    root=Path(root).resolve();errors=[]
    if not (root/'AGENTS.md').is_file():errors.append('Missing root AGENTS.md')
    files=instruction_files(root)
    skills=sorted((root/'.agents/skills').glob('*/SKILL.md'))
    if not skills:errors.append('No discoverable skills in .agents/skills')
    for path in skills:
        text=path.read_text(encoding='utf-8');label=str(path.relative_to(root))
        parts=text.split('---',2)
        if len(parts)!=3 or parts[0].strip():errors.append(f'{label}: missing YAML frontmatter');continue
        try:meta=yaml.safe_load(parts[1])
        except yaml.YAMLError:errors.append(f'{label}: invalid YAML frontmatter');continue
        if not isinstance(meta,dict):errors.append(f'{label}: frontmatter must be a mapping');continue
        name=meta.get('name');description=meta.get('description')
        if not isinstance(name,str) or not NAME.fullmatch(name) or len(name)>64 or name!=path.parent.name:
            errors.append(f'{label}: name must match the lowercase hyphenated skill directory')
        if not isinstance(description,str) or not description.strip() or len(description)>1024:
            errors.append(f'{label}: description must be a nonempty string of at most 1024 characters')
        if set(meta)-ALLOWED:errors.append(f'{label}: unsupported frontmatter keys')
        if not parts[2].strip():errors.append(f'{label}: missing workflow instructions')
    for path in files:
        text=re.sub(r'```.*?```','',path.read_text(encoding='utf-8'),flags=re.S)
        for raw in LINK.findall(text):
            destination=raw.strip().strip('<>');url=urlsplit(destination)
            if url.scheme in ('https','http','mailto') or not url.path:continue
            if url.scheme or url.netloc:
                errors.append(f'{path.relative_to(root)}: unsupported link {destination}');continue
            target=(path.parent/unquote(url.path)).resolve()
            if not target.is_relative_to(root):errors.append(f'{path.relative_to(root)}: link escapes repository: {destination}')
            elif not target.exists():errors.append(f'{path.relative_to(root)}: missing link target: {destination}')
    return errors,len(files),len(skills)

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--root',type=Path,default=Path(__file__).resolve().parents[1]);args=parser.parse_args()
    errors,files,skills=validate(args.root)
    if errors:
        print('\n'.join(errors),file=sys.stderr);raise SystemExit(1)
    print(f'Validated {files} instruction documents and {skills} discoverable skills.')
