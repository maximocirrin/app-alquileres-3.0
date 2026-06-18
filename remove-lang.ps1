$dir = "c:\Users\maxim\OneDrive\Escritorio\Proyectos\PropManager\app-alquileres-3.0"
$files = Get-ChildItem -Path $dir -Recurse -Include *.html,*.js,*.css -Exclude node_modules,.git,remove-lang.js,remove-lang.ps1,fix-lang.js

foreach ($file in $files) {
    try {
        $content = [System.IO.File]::ReadAllText($file.FullName, [System.Text.Encoding]::UTF8)
        $original = $content

        # CSS blocks
        $content = $content -replace '(?s)/\*.*?Google Translate Custom Overrides.*?\*/.*?#goog-gt-tt\s*\{\s*display:\s*none\s*!important;\s*\}', ''
        $content = $content -replace '(?s)iframe\.goog-te-banner-frame\s*\{.*?\}\s*', ''
        $content = $content -replace '(?s)\.goog-te-banner-frame\s*\{.*?\}\s*', ''
        $content = $content -replace '(?s)\.goog-te-banner-frame\.skiptranslate\s*\{.*?\}\s*', ''
        $content = $content -replace '(?s)\.skiptranslate>iframe\s*\{.*?\}\s*', ''
        $content = $content -replace '(?s)\.VIpgJd-ZVi9od-aZ2wEe-wOHMyf\s*\{.*?\}\s*', ''
        $content = $content -replace '(?s)\.VIpgJd-ZVi9od-ORHb-OEVmcd\s*\{.*?\}\s*', ''
        $content = $content -replace '(?s)#google_translate_element\s*\{.*?\}\s*', ''
        $content = $content -replace '(?s)\.goog-tooltip\s*\{.*?\}\s*', ''
        $content = $content -replace '(?s)\.goog-tooltip:hover\s*\{.*?\}\s*', ''
        $content = $content -replace '(?s)\.goog-text-highlight\s*\{.*?\}\s*', ''
        $content = $content -replace '(?s)font\s*\{\s*background-color:\s*transparent\s*!important;\s*box-shadow:\s*none\s*!important;\s*\}\s*', ''
        $content = $content -replace '(?s)#goog-gt-tt\s*\{.*?\}\s*', ''
        $content = $content -replace '(?s)\.owner-auth-language\s*\{.*?\}\s*', ''

        # HTML / Scripts
        $content = $content -replace '(?s)<!--\s*Google Translate Integration\s*-->.*?<div id="google_translate_element"[^>]*></div>', ''
        $content = $content -replace '(?s)<div id="google_translate_element"[^>]*></div>\s*', ''
        $content = $content -replace '(?s)<script type="text/javascript">\s*function googleTranslateElementInit\(\).*?</script>\s*', ''
        $content = $content -replace '(?s)<script[^>]*src="https://translate\.google\.com/translate_a/element\.js\?cb=googleTranslateElementInit"[^>]*></script>\s*', ''
        $content = $content -replace '(?s)<!--\s*Custom Language Selector\s*-->\s*', ''
        $content = $content -replace '(?s)<div class="relative group inline-block z-\[110\]">.*?</ul>\s*</div>\s*</div>\s*', ''
        $content = $content -replace '(?s)<!-- Right: Language Selector -->\s*', ''
        $content = $content -replace '(?s)<div class="owner-auth-language"[^>]*>.*?</div>\s*', ''
        $content = $content -replace '(?s)<span class="current-lang-display[^>]*>.*?</span>\s*', ''
        
        $content = $content -replace '(?s)<style>\s*</style>', ''

        if ($content -ne $original) {
            [System.IO.File]::WriteAllText($file.FullName, $content, [System.Text.Encoding]::UTF8)
            Write-Host "Cleaned: $($file.FullName)"
        }
    } catch {
        Write-Host "Error processing: $($file.FullName)"
    }
}

$fixLang = Join-Path -Path $dir -ChildPath "fix-lang.js"
if (Test-Path $fixLang) {
    Remove-Item $fixLang -Force
    Write-Host "Deleted fix-lang.js"
}

Write-Host "Done."
