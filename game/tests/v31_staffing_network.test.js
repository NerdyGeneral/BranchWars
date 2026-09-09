'use strict';
// Repeat the complete client suite on new Group7 rules in addition to the
// unchanged explicit Group6 cases. No old fixture or expected game is rewritten.
if(!process.argv.includes('--v31'))process.argv.push('--v31');
require('./department_staffing_network.test.js');
