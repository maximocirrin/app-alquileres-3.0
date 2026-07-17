$navHtmlBytes = [System.IO.File]::ReadAllBytes(".\components\navbar.html")
$navBase64 = [Convert]::ToBase64String($navHtmlBytes)
$navJs = @"
(function() {
    var b64 = '$navBase64';
    var decoded = decodeURIComponent(escape(window.atob(b64)));
    var div = document.createElement('div');
    div.innerHTML = decoded;
    while(div.firstChild) {
        document.currentScript.parentNode.insertBefore(div.firstChild, document.currentScript);
    }
})();
"@
Set-Content -Path "js\navbar.js" -Value $navJs -Encoding UTF8

$pubHtmlBytes = [System.IO.File]::ReadAllBytes(".\components\publish-property-view.html")
$pubBase64 = [Convert]::ToBase64String($pubHtmlBytes)
$pubJs = @"
(function() {
    var b64 = '$pubBase64';
    var decoded = decodeURIComponent(escape(window.atob(b64)));
    var div = document.createElement('div');
    div.innerHTML = decoded;
    while(div.firstChild) {
        document.currentScript.parentNode.insertBefore(div.firstChild, document.currentScript);
    }
})();
"@
Set-Content -Path "js\publish-property.js" -Value $pubJs -Encoding UTF8
