const SETUP_FEATURE_IDS = Object.freeze({ facilityExtensionsVersion:'facilityExtensionsPreview', commercialAccountsVersion:'commercialAccountsPreview', financialGroupVersion: 'financialGroupPreview', campaignRulesVersion: 'rivalryPilot', serviceExpansionVersion: 'serviceExpansion',
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
function readSetupFeatureOptions() {
  const container=$('#setupFeatureOptions'), binding=container._featureSelectionBinding;
  // The committed scalar rules also include underlying systems with no checkbox.
  // Do not reconstruct this edition from only its visible compatibility controls.
  if (!binding) return readFeatureSelection(container);
  // Retain the historical visible-option shape and implicit creation defaults;
  // carry explicitly selected hidden previews instead of dropping their markers.
  return Object.fromEntries(Object.entries(binding.read()).filter(([field,value])=>{
    const def=E.CAMPAIGN_FEATURES.find(x=>x.field===field);
    return def?.visible || def && !def.implicit && value>0;
  }));
}
function featureSelectionSummary(options) {
  const rules = E.campaignRules(options, { context: 'lobby' }), selected = rules.features.filter(feature => feature.visible && feature.enabled);
  return (options.financialGroupVersion ? 'Expanded edition: a connected regional banking simulation with optional Financial Group businesses.' : selected.length ? 'Historical custom rules: ' + selected.length + ' optional systems selected. Existing campaigns keep their rules.' : 'Core edition: original campaign rules. No optional systems.') +
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
    `<div class="feature-modes" role="group" aria-label="Campaign complexity">` +
    `<button type="button" class="btn" data-feature-mode="core" aria-pressed="${!selectedFeatureCount(rules)}"${settings.disabled ? ' disabled' : ''}>Core edition</button>` +
    `<button type="button" class="btn" data-feature-mode="expanded" aria-pressed="${!!options.financialGroupVersion}"${settings.disabled ? ' disabled' : ''}>Expanded edition</button>` +
    `<p class="micro muted">${expandedEditionDescription().join(' · ')}. Systems work together; starting a subsidiary remains your choice. Rules are fixed once play starts. Preview balance remains provisional.</p></div>` +
    `<details hidden class="feature-selection-details" data-feature-prefix="${esc(prefix)}"${(settings.expanded ?? featureSelectionExpansion[prefix]) ? ' open' : ''}><summary>Compatibility settings</summary>` +
    `<div hidden data-feature-fields>` +
    pilot + descriptors.filter(feature => feature.field !== 'featureRulesVersion').map(row).join('') + '</div></details>' +
    '<div class="feature-selection-status small bad" role="alert"></div>';
}
function selectedFeatureCount(rules) { return rules.features.filter(feature => feature.visible && feature.enabled).length; }
function expandedEditionDescription() {
  return ['Six regional markets with a finite customer economy', 'Persistent loan and deposit products, including qualified company lending', 'Offices, shared service rooms, departments and specialist teams', 'Advertising, customer onboarding, business accounts and service contracts', 'Research delivery, optional insurance, investment advice, brokerage and custody businesses, company shares and reviewed acquisitions'];
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
    else if(pending.control?.dataset?.featureMode)pending.container.querySelector?.('[data-feature-mode="'+pending.control.dataset.featureMode+'"]')?.focus?.();
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
    const field = mode === 'core' ? 'campaignRulesVersion' : 'facilityExtensionsVersion';
    const input = element.querySelector(`[data-feature-field="${field}"]`);
    if (!input || input.disabled) return;
    input._editionRequest = mode;
    input._editionButton = event.target;
    input.checked = mode !== 'core';
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
  element.addEventListener('change', event => {
    const control = event.target, field = control?.dataset?.featureField;
    if (!field) return;
    const current = element._featureSelectionBinding, options = current.read(), requested = !!control.checked;
    const edition = control._editionRequest, editionButton = control._editionButton;
    delete control._editionRequest; delete control._editionButton;
    const details = control.closest?.('details');
    if (details?.dataset?.featurePrefix !== undefined) featureSelectionExpansion[details.dataset.featurePrefix] = !!details.open;
    control.checked = Number(options[field] || 0) > 0;
    if (control.disabled || current.canEdit?.() === false) return;
    if (featureSelectionPending()) cancelFeatureSelectionConfirmation();
    try {
      const descriptor = featureSelectionDescriptors().find(feature => feature.field === field);
      if (!descriptor || descriptor.available === false) throw Error('This optional system is unavailable in this engine.');
      const proposal = edition ? E.previewCampaignEdition(options, edition) : E.previewFeatureSelection(options, { field, value: requested ? descriptor.setupVersion : 0 });
      if (!proposal.rules.valid) throw Error(proposal.rules.issues.map(issue => issue.message).join(' '));
      const pending = { container: element, control: editionButton || control, proposal, revision: current.getRevision?.() ?? 0, before: JSON.stringify(options) };
      if (!proposal.requiresConfirmation) { commitFeatureSelection(pending); return; }
      pendingFeatureSelection = pending;
      $('#featureSelectionTitle').textContent = edition ? (edition === 'expanded' ? 'Choose Expanded edition?' : 'Choose Core edition?') : (requested ? 'Enable ' : 'Disable ') + descriptor.label + '?';
      $('#featureSelectionExplanation').textContent = edition ? 'This changes the setup for the next campaign only. Existing saves are unchanged. Nothing changes until you confirm.' : 'This selection also changes the systems below. Nothing changes until you confirm.';
      $('#featureSelectionAffected').innerHTML = edition ? (edition === 'expanded' ? expandedEditionDescription() : ['Original banking rivalry and its existing campaign-size choices', 'Expanded systems will be off for this new campaign']).map(text => '<li>' + esc(text) + '</li>').join('') : proposal.changes.filter(change => change.field !== field).map(change =>
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
