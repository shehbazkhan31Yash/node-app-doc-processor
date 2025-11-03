/**
 * Single place to configure and export csurf middleware.
 * Uses cookie-based tokens (no server session required).
 *
 * Requires: cookie-parser to be registered in index.js before csurf is used.
 */

const csrf = require('csurf');

// Configure csurf to store token in a cookie
const csrfProtection = csrf({ cookie: true });

module.exports = { csrfProtection };