import os
import re

files = ['index.html', 'propietarios.html', 'como-funciona.html', 'administrador.html', 'login.html']
for f in files:
    if not os.path.exists(f): continue
    with open(f, 'r', encoding='utf-8') as file:
        content = file.read()
    
    # We want to replace <a href=\"#\" ...>T&eacute;rminos or Términos
    # Regular expression to match the specific links
    pattern = r'(<a\s+[^>]*?href=)[\'\"]#[\'\"]([^>]*?>\s*(?:T&eacute;rminos|Términos))'
    new_content = re.sub(pattern, r'\g<1>"terminos.html"\g<2>', content)
    
    if new_content != content:
        with open(f, 'w', encoding='utf-8') as file:
            file.write(new_content)
        print(f'Updated {f}')
