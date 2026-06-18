$file = "administrador.html"
$lines = Get-Content $file
$count = 0
$styleStart = 0
$scriptStart = 0
$inStyle = $false
$inScript = $false
$styleCount = 0
$scriptCount = 0
$output = @()

foreach ($line in $lines) {
    $count++
    if ($line -match "<head>") { $output += "Linea $count: Empieza <head>" }
    if ($line -match "</head>") { $output += "Linea $count: Termina </head>" }
    if ($line -match "<body") { $output += "Linea $count: Empieza <body>" }
    if ($line -match "</body>") { $output += "Linea $count: Termina </body>" }
    
    if ($line -match "<style") { $inStyle = $true; $styleStart = $count }
    if ($inStyle -and $line -match "</style>") { 
        $inStyle = $false; 
        $linesCount = $count - $styleStart + 1
        $styleCount += $linesCount
        $output += "Lineas $styleStart al $count ($linesCount lineas): Bloque de estilos <style>" 
    }
    
    if ($line -match "<script") { $inScript = $true; $scriptStart = $count }
    if ($inScript -and $line -match "</script>") { 
        $inScript = $false; 
        $linesCount = $count - $scriptStart + 1
        $scriptCount += $linesCount
        $output += "Lineas $scriptStart al $count ($linesCount lineas): Bloque de <script>" 
    }
    
    if ($line -match "<nav") { $output += "Linea $count: Empieza barra de navegacion <nav>" }
    if ($line -match "</nav>") { $output += "Linea $count: Termina barra de navegacion </nav>" }
    
    if ($line -match "<main") { $output += "Linea $count: Empieza contenido principal <main>" }
    if ($line -match "</main>") { $output += "Linea $count: Termina contenido principal </main>" }
    
    if ($line -match "<footer") { $output += "Linea $count: Empieza pie de pagina <footer>" }
    if ($line -match "</footer>") { $output += "Linea $count: Termina pie de pagina </footer>" }
}

Write-Host "Total lineas: $count"
Write-Host "Total CSS: $styleCount"
Write-Host "Total JS: $scriptCount"
$output | ForEach-Object { Write-Host $_ }
