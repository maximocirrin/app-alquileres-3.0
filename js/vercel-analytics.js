/**
 * Vercel Web Analytics Integration
 * 
 * This script initializes Vercel Web Analytics for vanilla HTML/JavaScript sites.
 * When deployed to Vercel, it uses the /_vercel/insights/script.js endpoint.
 * 
 * Documentation: https://vercel.com/docs/analytics/quickstart
 */

(function() {
    'use strict';
    
    // Initialize the Vercel Analytics queue
    // This ensures events are captured even before the script loads
    window.va = window.va || function () { 
        (window.vaq = window.vaq || []).push(arguments); 
    };
    
})();

// Note: The actual analytics script is loaded via the script tag in HTML:
// <script defer src="/_vercel/insights/script.js"></script>
