$files = @("index.html", "propietarios.html", "como-funciona.html", "administrador.html")
foreach ($f in $files) {
    if (Test-Path $f) {
        $content = Get-Content $f -Raw
        
        # We know index.html, administrador.html, como-funciona.html and the second footer in propietarios.html use:
        # <a href="#"
        #   class="...">T&eacute;rminos
        $content = $content -replace '<a href="#"\s+class="([^"]+)">T&eacute;rminos', '<a href="terminos.html" class="$1">T&eacute;rminos'
        
        # propietarios.html first footer uses:
        # <a class="..." href="#">Términos
        $content = $content -replace '<a class="([^"]+)" href="#">Términos', '<a class="$1" href="terminos.html">Términos'
        
        Set-Content $f $content
        Write-Host "Updated $f"
    }
}
