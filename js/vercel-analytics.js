/**
 * Vercel Web Analytics
 * Initialization code for tracking page views and user interactions
 * Docs: https://vercel.com/docs/analytics/quickstart
 */

// Initialize the analytics queue
window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };

// Dynamically inject the Vercel Analytics script
(function() {
    var script = document.createElement('script');
    script.defer = true;
    script.src = '/_vercel/insights/script.js';
    document.head.appendChild(script);
})();
