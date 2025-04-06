/**
 * This patch file fixes the [DEP0060] DeprecationWarning about util._extend in Node.js
 * 
 * It monkey patches the deprecated util._extend function to use Object.assign instead.
 * This prevents the [DEP0060] DeprecationWarning from appearing.
 * 
 * IMPORTANT: This must be loaded at the very start of next.config.js before any other modules.
 */

// Only apply in Node.js environment, not in the browser
if (typeof process !== 'undefined' && process.versions && process.versions.node) {
  try {
    // Get the util module
    const util = require('util');
    
    // Check if the deprecated property exists
    if (util._extend) {
      // Save original method in case we need it for compatibility
      const originalExtend = util._extend;
      
      // Replace with Object.assign which is the official replacement
      util._extend = function(target, source) {
        // First try the standard Object.assign approach
        try {
          return Object.assign(target, source);
        } catch (err) {
          // Fallback to original method if Object.assign fails for any reason
          return originalExtend(target, source);
        }
      };
      
      // For monitoring - only log in development
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ Successfully patched util._extend deprecation warning');
      }
    }
    
    // In strict environments, we can also make this property read-only to prevent further issues
    if (Object.defineProperty && util._extend) {
      Object.defineProperty(util, '_extend', {
        value: util._extend,
        writable: false,  // Make property read-only
        configurable: false // Prevent further reconfiguration
      });
    }
  } catch (error) {
    console.error('⚠️ Failed to patch util._extend:', error);
  }
}