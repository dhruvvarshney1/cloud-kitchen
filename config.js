/**
 * Environment-Agnostic Configuration for GitHub Pages Deployment
 * 
 * This configuration file automatically detects the hosting environment
 * and adjusts paths accordingly for both local development and GitHub Pages.
 */

(function() {
  'use strict';

  // Detect if running on GitHub Pages
  const isGitHubPages = window.location.hostname.includes('github.io');
  
  // Detect repository name from pathname for GitHub Pages
  // Example: https://username.github.io/cloud-kitchen/ => basePath = '/cloud-kitchen'
  let basePath = '';
  if (isGitHubPages) {
    const pathParts = window.location.pathname.split('/').filter(Boolean);
    // First part after domain is typically the repository name
    basePath = pathParts.length > 0 ? `/${pathParts[0]}` : '';
  }

  // Create global app configuration
  window.appConfig = {
    // Base path for all resources
    basePath: basePath,
    
    // Full base URL
    baseUrl: isGitHubPages 
      ? `https://${window.location.hostname}${basePath}`
      : window.location.origin,
    
    // API URL (adjust this based on your backend)
    apiUrl: isGitHubPages 
      ? `https://${window.location.hostname}${basePath}/api`
      : 'http://localhost:8080/api',
    
    // Environment indicator
    environment: isGitHubPages ? 'production' : 'development',
    
    // Helper function to resolve asset paths
    asset: function(path) {
      // Remove leading slash if present
      const cleanPath = path.startsWith('/') ? path.slice(1) : path;
      return `${this.basePath}/${cleanPath}`;
    },
    
    // Helper function to navigate to pages
    navigate: function(page) {
      // Remove leading slash if present
      const cleanPage = page.startsWith('/') ? page.slice(1) : page;
      window.location.href = `${this.basePath}/${cleanPage}`;
    },
    
    // Feature flags
    features: {
      enablePWA: true,
      enableMessaging: true,
      enableAnalytics: isGitHubPages,
      enableDebugMode: !isGitHubPages
    }
  };

  // Log configuration in development mode
  if (window.appConfig.features.enableDebugMode) {
    console.log('📦 App Configuration:', {
      basePath: window.appConfig.basePath,
      baseUrl: window.appConfig.baseUrl,
      environment: window.appConfig.environment,
      hostname: window.location.hostname,
      pathname: window.location.pathname
    });
  }

  // Export for ES modules (if using)
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.appConfig;
  }

})();
