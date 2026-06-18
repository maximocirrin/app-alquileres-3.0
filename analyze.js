const fs = require('fs');
const readline = require('readline');

async function analyze() {
  const fileStream = fs.createReadStream('administrador.html');
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let lineCount = 0;
  let inStyle = false;
  let inScript = false;
  let inMain = false;
  let inNav = false;
  let inFooter = false;
  let styleStart = 0;
  let scriptStart = 0;
  let styleLineCount = 0;
  let scriptLineCount = 0;
  
  let structure = [];
  
  for await (const line of rl) {
    lineCount++;
    
    // Check tags
    if (line.includes('<head>')) structure.push(`Line ${lineCount}: Empieza <head>`);
    if (line.includes('</head>')) structure.push(`Line ${lineCount}: Termina </head>`);
    if (line.includes('<body')) structure.push(`Line ${lineCount}: Empieza <body>`);
    if (line.includes('</body>')) structure.push(`Line ${lineCount}: Termina </body>`);
    
    if (line.includes('<style')) {
        inStyle = true;
        styleStart = lineCount;
    }
    if (inStyle && line.includes('</style>')) {
        inStyle = false;
        structure.push(`Lines ${styleStart}-${lineCount} (${lineCount - styleStart + 1} líneas): Bloque de estilos <style>`);
        styleLineCount += (lineCount - styleStart + 1);
    }
    
    if (line.includes('<script')) {
        inScript = true;
        scriptStart = lineCount;
    }
    if (inScript && line.includes('</script>')) {
        inScript = false;
        structure.push(`Lines ${scriptStart}-${lineCount} (${lineCount - scriptStart + 1} líneas): Bloque de <script>`);
        scriptLineCount += (lineCount - scriptStart + 1);
    }
    
    if (line.includes('<nav')) structure.push(`Line ${lineCount}: Empieza barra de navegación <nav>`);
    if (line.includes('</nav>')) structure.push(`Line ${lineCount}: Termina barra de navegación </nav>`);
    
    if (line.includes('<main')) structure.push(`Line ${lineCount}: Empieza contenido principal <main>`);
    if (line.includes('</main>')) structure.push(`Line ${lineCount}: Termina contenido principal </main>`);
    
    if (line.includes('<footer')) structure.push(`Line ${lineCount}: Empieza pie de página <footer>`);
    if (line.includes('</footer>')) structure.push(`Line ${lineCount}: Termina pie de página </footer>`);
  }
  
  console.log("=== ANÁLISIS ESTRUCTURAL DE ADMINISTRADOR.HTML ===");
  console.log(`Total de líneas: ${lineCount}`);
  console.log(`Total de líneas de CSS en línea (<style>): ${styleLineCount}`);
  console.log(`Total de líneas de JavaScript incrustado (<script>): ${scriptLineCount}`);
  console.log("-------------------------------------------------");
  console.log("Detalle de las principales secciones:");
  structure.forEach(s => console.log(s));
}

analyze();
