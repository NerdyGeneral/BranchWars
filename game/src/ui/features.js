const SETUP_FEATURE_IDS = Object.freeze({ financialGroupVersion: 'financialGroupPreview', campaignRulesVersion: 'rivalryPilot', serviceExpansionVersion: 'serviceExpansion',
  managementVersion: 'institutionManagement', customerDemandVersion: 'customerNeeds', workforceVersion: 'specialistWorkforce',
  customerOwnershipVersion: 'householdOwnership', creditPerformanceVersion: 'creditPerformance', segmentDepositsVersion: 'segmentDeposits',
  productProgramsVersion: 'productPrograms', advertisingVersion: 'advertisingPreview', regionalGrowthVersion: 'regionalGrowthPreview',
  relationshipOffersVersion: 'relationshipOffersPreview', onboardingVersion: 'onboardingPreview', featureRulesVersion: 'modularCombinationsPreview' });
let pendingFeatureSelection = null, setupFeatureRevision = 0;
const featureSelectionExpansion = Object.create(null);
function featureSelectionPending() { return pendingFeatureSelection !== null; }
function featureSelectionDescriptors() { return E.CAMPAIGN_FEATURES.filter(feature => feature.visible); }
function modularFeatureSelectionAvailable() {
  return featureSelectionDescriptors().some(feature => feature.field === 'featureRulesVersion' && feature.available === true);
}
function featureSelectionId(field, prefix = '') { return prefix ? prefix + field : SETUP_FEATURE_IDS[field]; }
function readFeatureSelection(container, prefix = '') {
  const source = typeof container === 'string' ? $(container) : container, options = {};
  for (const feature of featureSelectionDescriptors()) {
    const control = source.querySelector ? source.querySelector('#' + featureSelectionId(feature.field, prefix)) : $('#' + featureSelectionId(feature.field, prefix));
    const selected = !!control?.checked;
    if (feature.field === 'featureRulesVersion') { if (selected && modularFeatureSelectionAvailable()) options.featureRulesVersion = 1; }
    else options[feature.field] = selected ? feature.setupVersion : feature.field === 'campaignRulesVersion' ? undefined : 0;
  }
  return options;
}
function readSetupFeatureOptions() { return readFeatureSelection($('#setupFeatureOptions')); }
function featureSelectionSummary(options) {
  const rules = E.campaignRules(options, { context: 'lobby' }), selected = rules.features.filter(feature => feature.visible && feature.enabled);
  return (selected.length ? 'Selected: ' + selected.map(feature => feature.label).join(', ') + '.' : 'Selected: original campaign rules. No optional systems.') +
    (rules.enabled.includes('campaignRulesVersion') ? ' Regional Rivalry overrides campaign size: six markets.' : ' Campaign size follows the selector.') +
    (rules.valid ? '' : ' Selection needs attention: ' + rules.issues.map(issue => issue.message).join(' '));
}
function renderFeatureSelection(options, settings = {}) {
  const prefix = settings.prefix || '', rules = E.campaignRules(options, { context: 'lobby' }), descriptors = rules.features.filter(feature => feature.visible);
  const row = feature => {
    const id = featureSelectionId(feature.field, prefix), selected = Number(options[feature.field] || 0) > 0;
    const requirements = (feature.requires || []).map(required => E.CAMPAIGN_FEATURES.find(candidate => candidate.field === required.field)?.label || required.field);
    const unavailable = feature.available === false ? feature.disabledReason || 'Unavailable in this engine.' : '';
    const label = feature.label + (feature.field === 'featureRulesVersion' ? ' preview' : '');
    return `<div class="feature-option"><label for="${esc(id)}"><input id="${esc(id)}" type="checkbox" data-feature-field="${esc(feature.field)}"${selected ? ' checked' : ''}${settings.disabled || feature.available === false ? ' disabled' : ''} aria-describedby="${esc(id)}-detail"> ${esc(label)}</label>` +
      `<div id="${esc(id)}-detail" class="micro muted">${esc(feature.description || '')}<br><span class="feature-maturity">${esc(feature.maturity || 'Experimental preview')}</span> · ` +
      `${requirements.length ? 'Requires: ' + esc(requirements.join(', ')) + '.' : 'No optional prerequisites.'}${unavailable ? ' ' + esc(unavailable) : ''}</div></div>`;
  };
  const marker = descriptors.find(feature => feature.field === 'featureRulesVersion');
  const pilot = marker ? row(marker) : `<div class="feature-option"><label for="${esc(featureSelectionId('featureRulesVersion', prefix))}"><input id="${esc(featureSelectionId('featureRulesVersion', prefix))}" type="checkbox" disabled> Modular combinations preview</label><div class="micro muted">Unavailable in this engine. Existing cumulative setup remains unchanged.</div></div>`;
  return `<div class="feature-selection-summary small" role="status" aria-live="polite">${esc(featureSelectionSummary(options))}</div>` +
    `<details class="feature-selection-details" data-feature-prefix="${esc(prefix)}"${(settings.expanded ?? featureSelectionExpansion[prefix]) ? ' open' : ''}><summary>Optional systems · ${descriptors.filter(feature => feature.enabled).length} selected</summary>` +
    `<p class="micro muted">Choose the complexity you want. Prerequisite changes are shown for confirmation; existing saves keep their rules. Preview balance is not accepted as final.</p>` +
    `<div class="feature-modes" role="group" aria-label="Campaign complexity">` +
    `<button type="button" class="btn" data-feature-mode="core"${settings.disabled ? ' disabled' : ''}>Core rules</button>` +
    `<button type="button" class="btn" data-feature-mode="expanded"${settings.disabled ? ' disabled' : ''}>Expanded rules</button>` +
    `<p class="micro muted">Core is the original campaign. Expanded adds every optional system; they depend on one another, so they arrive together.</p></div>` +
    `<div hidden data-feature-fields>` +
    pilot + descriptors.filter(feature => feature.field !== 'featureRulesVersion').map(row).join('') + '</div></details>' +
    '<div class="feature-selection-status small bad" role="alert"></div>';
}
function featureSelectionError(container, binding, message) {
  const status = container.querySelector?.('.feature-selection-status');
  if (status) status.textContent = message;
  if (binding.onError) binding.onError(message);
}
function closeFeatureSelectionConfirmation() {
  const pending = pendingFeatureSelection;
  if (!pending) return;
  pendingFeatureSelection = null;
  const dialog = $('#featureSelectionDialog');
  if (dialog.close && dialog.open) dialog.close();
  dialog.classList.add('hidden');
  const binding = pending.container._featureSelectionBinding;
  if (binding?.onPendingChange) binding.onPendingChange(false);
  const focus = pending.control?.id ? $('#' + pending.control.id) : pending.control;
  focus?.focus?.();
}
function cancelFeatureSelectionConfirmation() { closeFeatureSelectionConfirmation(); return false; }
function commitFeatureSelection(pending) {
  const binding = pending.container._featureSelectionBinding;
  if (!binding || binding.canEdit?.() === false || (binding.getRevision?.() ?? 0) !== pending.revision || JSON.stringify(binding.read()) !== pending.before) {
    featureSelectionError(pending.container, binding || {}, 'Settings changed while confirmation was open. Review the current selection and try again.');
    return false;
  }
  try {
    if (binding.commit(pending.proposal.options, pending.revision) === false) return false;
    // Commit may replace the controls. Restore focus to the new node, not the
    // detached checkbox that closed the confirmation dialog.
    if (pending.control?.id) $('#' + pending.control.id)?.focus?.();
    return true;
  } catch (error) { featureSelectionError(pending.container, binding, error.message); return false; }
}
function confirmFeatureSelection() {
  const pending = pendingFeatureSelection;
  if (!pending) return false;
  closeFeatureSelectionConfirmation();
  return commitFeatureSelection(pending);
}
function bindFeatureSelection(container, binding) {
  const element = typeof container === 'string' ? $(container) : container;
  element._featureSelectionBinding = binding;
  if (element._featureSelectionBound) return;
  element._featureSelectionBound = true;
  element.addEventListener('toggle', event => {
    const prefix = event.target?.dataset?.featurePrefix;
    if (typeof prefix === 'string') featureSelectionExpansion[prefix] = !!event.target.open;
  }, true);
  element.addEventListener('click', event => {
    const mode = event.target?.dataset?.featureMode;
    if (!mode) return;
    const field = mode === 'core' ? 'campaignRulesVersion' : 'financialGroupVersion';
    const input = element.querySelector(`[data-feature-field="${field}"]`);
    if (!input || input.disabled) return;
    input.checked = mode !== 'core';
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
  element.addEventListener('change', event => {
    const control = event.target, field = control?.dataset?.featureField;
    if (!field) return;
    const current = element._featureSelectionBinding, options = current.read(), requested = !!control.checked;
    const details = control.closest?.('details');
    if (details?.dataset?.featurePrefix !== undefined) featureSelectionExpansion[details.dataset.featurePrefix] = !!details.open;
    control.checked = Number(options[field] || 0) > 0;
    if (control.disabled || current.canEdit?.() === false) return;
    if (featureSelectionPending()) cancelFeatureSelectionConfirmation();
    try {
      const descriptor = featureSelectionDescriptors().find(feature => feature.field === field);
      if (!descriptor || descriptor.available === false) throw Error('This optional system is unavailable in this engine.');
      const proposal = E.previewFeatureSelection(options, { field, value: requested ? descriptor.setupVersion : 0 });
      if (!proposal.rules.valid) throw Error(proposal.rules.issues.map(issue => issue.message).join(' '));
      const pending = { container: element, control, proposal, revision: current.getRevision?.() ?? 0, before: JSON.stringify(options) };
      if (!proposal.requiresConfirmation) { commitFeatureSelection(pending); return; }
      pendingFeatureSelection = pending;
      $('#featureSelectionTitle').textContent = (requested ? 'Enable ' : 'Disable ') + descriptor.label + '?';
      $('#featureSelectionAffected').innerHTML = proposal.changes.filter(change => change.field !== field).map(change =>
        `<li>${esc(change.label)}: ${change.to ? 'on' : 'off'}${change.reason ? ' — ' + esc(change.reason) : ''}</li>`).join('');
      const dialog = $('#featureSelectionDialog'); dialog.classList.remove('hidden');
      if (dialog.showModal && !dialog.open) dialog.showModal();
      $('#featureSelectionCancel').focus?.();
      if (current.onPendingChange) current.onPendingChange(true);
    } catch (error) { featureSelectionError(element, current, error.message); }
  });
}
function initializeSetupFeatures() {
  const container = $('#setupFeatureOptions'), options = readSetupFeatureOptions();
  const refresh = selected => { container.innerHTML = renderFeatureSelection(selected); };
  refresh(options);
  // Read the committed selection, not the browser's already-toggled checkbox.
  let committed = options;
  bindFeatureSelection(container, { read: () => ({ ...committed }), getRevision: () => setupFeatureRevision,
    commit: selected => { committed = { ...selected }; setupFeatureRevision++; refresh(committed); }, onError: setStartMessage });
  $('#featureSelectionConfirm').addEventListener('click', confirmFeatureSelection);
  $('#featureSelectionCancel').addEventListener('click', cancelFeatureSelectionConfirmation);
  $('#featureSelectionDialog').addEventListener('cancel', event => { event.preventDefault(); cancelFeatureSelectionConfirmation(); });
}
initializeSetupFeatures();
