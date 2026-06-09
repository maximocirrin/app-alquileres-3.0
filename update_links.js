const fs = require('fs');
const files = ['index.html', 'propietarios.html', 'como-funciona.html', 'administrador.html', 'login.html'];
files.forEach(f => {
  if (!fs.existsSync(f)) return;
  let content = fs.readFileSync(f, 'utf8');
  const pattern = /(<a\s+[^>]*?href=)[\'\"]#[\'\"]([^>]*?>\s*(?:T&eacute;rminos|Términos))/g;
  const newContent = content.replace(pattern, '$1"terminos.html"$2');
  if (newContent !== content) {
    fs.writeFileSync(f, newContent, 'utf8');
    console.log('Updated ' + f);
  }
});
