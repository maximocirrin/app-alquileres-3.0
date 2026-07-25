$htmlBytes = [System.IO.File]::ReadAllBytes("$PSScriptRoot\components\publish-property-view.html")
$base64 = [Convert]::ToBase64String($htmlBytes)
$js = @"
(function() {
    var b64 = '$base64';
    var decoded = decodeURIComponent(escape(window.atob(b64)));
    var div = document.createElement('div');
    div.innerHTML = decoded;
    while(div.firstChild) {
        document.currentScript.parentNode.insertBefore(div.firstChild, document.currentScript);
    }
})();
"@
[System.IO.File]::WriteAllText("$PSScriptRoot\js\publish-property.js", $js, [System.Text.Encoding]::UTF8)
Write-Host "Updated js/publish-property.js successfully"
