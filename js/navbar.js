(function() {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', 'components/navbar.html', false); // synchronous request
    try {
        xhr.send(null);
        if (xhr.status === 200) {
            document.write(xhr.responseText);
        } else {
            console.error('Failed to load navbar, status: ' + xhr.status);
        }
    } catch (e) {
        console.error('Error loading navbar:', e);
    }
})();
