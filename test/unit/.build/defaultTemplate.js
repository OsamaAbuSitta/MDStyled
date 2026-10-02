'use strict';
/** Stub for src/defaultTemplate. */
async function resolveDefaultTemplateAssets() { return { styles: [], scripts: [] }; }
function getTemplateAssets()  { return { styles: [], scripts: [] }; }
function hasDefaultTemplate() { return false; }
function resetPromptState()   {}
const NO_TEMPLATE = 'none';
module.exports = { resolveDefaultTemplateAssets, getTemplateAssets, hasDefaultTemplate, resetPromptState, NO_TEMPLATE };
