const fs = require('fs');
let content = fs.readFileSync('index.html', 'utf8');

// Add id to input
content = content.replace(
  '<input name="location"',
  '<input id="home-search" name="location"'
);

// Add initGoogleMap function
const mapScriptTarget = 'src="https://maps.googleapis.com/maps/api/js?key=AIzaSyAhfpCTOTmrdSqssKvlTvjgkGeljGoaJWo&callback=initGoogleMap&libraries=places&loading=async&v=weekly"></script>';

const scriptToAdd = `
<script>
    function initGoogleMap() {
        const input = document.getElementById('home-search');
        if (input && window.google) {
            new google.maps.places.Autocomplete(input, {
                types: ['(regions)'],
                componentRestrictions: { country: 'ar' }
            });
        }
    }
</script>
`;

if (content.includes(mapScriptTarget) && !content.includes('function initGoogleMap()')) {
    content = content.replace(
        mapScriptTarget,
        mapScriptTarget + '\n' + scriptToAdd
    );
}

fs.writeFileSync('index.html', content);
console.log("Patch applied successfully.");
