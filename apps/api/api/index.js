// Vercel Function: every request is rewritten here (see vercel.json) and served by the compiled
// Nest app in dist/, so production runs exactly what `nest build` emitted and the tests covered.
module.exports = require('../dist/serverless').default;
