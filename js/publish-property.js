document.addEventListener('DOMContentLoaded', () => {
    // Determine the container to inject the publish property wizard.
    // If we're injecting into a specific place, we might need a container, 
    // but the component itself is an absolute overlay/modal. We'll append it to the body or main.
    
    fetch('components/publish-property-view.html')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.text();
        })
        .then(data => {
            // Append the wizard to the body so it sits on top when activated
            const container = document.createElement('div');
            container.innerHTML = data;
            document.body.appendChild(container.firstElementChild);
            
            // Re-initialize any JS logic needed for the wizard
            // This is just the DOM injection, further logic should be triggered
            // when the user clicks 'Add Property'
            
            console.log('Publish property wizard injected successfully');
        })
        .catch(error => {
            console.error('Error loading publish property wizard:', error);
        });
});
