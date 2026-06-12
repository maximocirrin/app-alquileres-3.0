$file = "c:\Users\maxim\OneDrive\Escritorio\Proyectos\PropManager\app-alquileres-3.0\index.html"
$content = [System.IO.File]::ReadAllText($file)

$content = $content -replace '<input name="location"','<input id="home-search" name="location"'

$targetScript = 'src="https://maps.googleapis.com/maps/api/js?key=AIzaSyAhfpCTOTmrdSqssKvlTvjgkGeljGoaJWo&callback=initGoogleMap&libraries=places&loading=async&v=weekly"></script>'
$newScript = $targetScript + '
<script>
    function initGoogleMap() {
        const input = document.getElementById("home-search");
        if (input && window.google) {
            new google.maps.places.Autocomplete(input, {
                types: ["(regions)"],
                componentRestrictions: { country: "ar" }
            });
        }
    }
</script>'

if (-not $content.Contains("function initGoogleMap()")) {
    $content = $content.Replace($targetScript, $newScript)
}

[System.IO.File]::WriteAllText($file, $content, [System.Text.Encoding]::UTF8)
Write-Output "Patch applied successfully"
