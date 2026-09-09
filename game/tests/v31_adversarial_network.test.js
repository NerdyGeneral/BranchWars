'use strict';
// Extend all existing duplicate/recall/delayed-digest/checkpoint cases to the
// new economic version. The original default Group6 suite still runs separately.
if(!process.argv.includes('--v31'))process.argv.push('--v31');
require('./department_functions_network.test.js');
