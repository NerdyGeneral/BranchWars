// Campaign rules are derived from the existing version scalars. This catalog
// owns compatibility and setup choices, not simulation order or private books.
const MODULAR_FEATURE_RULES_AVAILABLE = true;
const CAMPAIGN_PEER_REQUIREMENTS = Object.freeze([
  ['financialGroupVersion', 'financialGroupSupported', 8, 1, 'Financial Group preview', 'FINANCIAL GROUP'],
  ['financialGroupVersion', 'departmentStaffingSupported', 2, 6, 'Frozen department staffing evidence', 'DEPARTMENT STAFFING'],
  ['featureRulesVersion', 'featureRulesSupported', 1, 1, 'Modular combinations preview', 'MODULAR RULES'],
  ['onboardingVersion', 'onboardingSupported', 1, 1, 'Customer onboarding preview', 'ONBOARDING'],
  ['relationshipOffersVersion', 'relationshipOffersSupported', 1, 1, 'Relationship offers preview', 'RELATIONSHIP OFFERS'],
  ['regionalGrowthVersion', 'regionalGrowthSupported', 1, 1, 'Regional growth preview', 'REGIONAL GROWTH'],
  ['advertisingVersion', 'advertisingSupported', 1, 1, 'Advertising preview', 'ADVERTISING'],
  ['productProgramsVersion', 'productProgramsSupported', 2, 1, 'Product programmes', 'PRODUCT PROGRAMMES'],
  ['segmentDepositsVersion', 'segmentDepositsSupported', 1, 1, 'Segment deposits', 'SEGMENT DEPOSITS'],
  ['creditPerformanceVersion', 'creditPerformanceSupported', 1, 1, 'Credit performance', 'CREDIT'],
  ['customerOwnershipVersion', 'customerOwnershipSupported', 1, 1, 'Household ownership', 'HOUSEHOLD'],
  ['workforceVersion', 'workforceSupported', 1, 1, 'Specialist workforce', 'WORKFORCE'],
  ['customerDemandVersion', 'customerDemandSupported', 2, 1, 'Customer needs', 'CUSTOMER NEEDS'],
  ['managementVersion', 'relationshipSupported', 1, 2, 'Relationship operations', 'RELATIONSHIP'],
  ['managementVersion', 'managementSupported', 1, 1, 'Living institution', 'LIVING INSTITUTION'],
  ['campaignRulesVersion', 'pilotSupported', 11, 1, 'Regional Rivalry', 'PILOT']
].map(([field, capability, supported, minimum, label, status], order) => Object.freeze({
  field, capability, supported, minimum, label, status, order, range: ['customerDemandSupported', 'productProgramsSupported', 'financialGroupSupported'].includes(capability)
})));
const CAMPAIGN_FEATURES = Object.freeze([
  ['campaignRulesVersion', 'Regional Rivalry', 1, null, true, false, 'Finite local franchises, competing institutions and branch upgrades.'],
  ['regionalEconomyVersion', 'Regional operations', 1, 'campaignRulesVersion', false, true, 'Local branch capacity and upgrades.'],
  ['marketEconomyVersion', 'Market economy', 1, 'regionalEconomyVersion', false, true, 'Conserved local ownership and outside institutions.'],
  ['creditLifecycleVersion', 'Credit lifecycle', 1, 'marketEconomyVersion', false, true, 'Owned loan cohorts and scheduled repayment.'],
  ['fundingCovenantVersion', 'Funding covenants', 1, 'creditLifecycleVersion', false, true, 'Funding obligations and supervision.'],
  ['depositProductsVersion', 'Deposit products', 1, 'fundingCovenantVersion', false, true, 'Owned deposits and promised product terms.'],
  ['termFundingVersion', 'Term funding', 1, 'depositProductsVersion', false, true, 'Locked terms and maturity instructions.'],
  ['retailLifecycleVersion', 'Retail products', 1, 'termFundingVersion', false, true, 'Deposit offers and their running costs.'],
  ['productDeploymentVersion', 'Product deployment', 1, 'retailLifecycleVersion', false, true, 'Build and deploy retail capabilities.'],
  ['contractRulesVersion', 'Service contracts', 1, 'productDeploymentVersion', false, true, 'Renewable commercial service agreements.'],
  ['serviceExpansionVersion', 'Expanded commercial services', 1, 'contractRulesVersion', true, true, 'Dedicated delivery staff, deployments and priced renewals.'],
  ['managementVersion', 'Living institution', 2, 'serviceExpansionVersion', true, false, 'Client histories, recurring research and service managers.'],
  ['customerDemandVersion', 'Customer needs', 2, 'managementVersion', true, false, 'Product fit and persistent service relationships.'],
  ['workforceVersion', 'Specialist workforce', 1, 'customerDemandVersion', true, false, 'Department expertise, training and payroll.'],
  ['customerOwnershipVersion', 'Household ownership', 1, 'workforceVersion', true, false, 'Segment-owned customers and retention mandates.'],
  ['creditPerformanceVersion', 'Credit performance', 1, 'customerOwnershipVersion', true, false, 'Delayed delinquency and collections compete for staff.'],
  ['segmentDepositsVersion', 'Segment deposits', 1, 'creditPerformanceVersion', true, false, 'Owned segment balances, product costs and maturity exits.'],
  ['productProgramsVersion', 'Product programmes', 2, 'segmentDepositsVersion', true, false, 'Development routes, local targeting, variable-account pricing and retirement.'],
  ['advertisingVersion', 'Advertising attribution', 1, 'productProgramsVersion', true, false, 'Local audience campaigns and measured finite intake.'],
  ['regionalGrowthVersion', 'Regional growth', 1, 'advertisingVersion', true, false, 'Outside economic arrivals and departures at month end.'],
  ['relationshipOffersVersion', 'Relationship offers', 1, 'regionalGrowthVersion', true, false, 'Voluntary product switching for existing customers.'],
  ['onboardingVersion', 'Customer onboarding', 1, 'relationshipOffersVersion', true, false, 'Applications, staff bottlenecks and funded activation.'],
  ['financialGroupVersion', 'Financial Group preview', 8, 'onboardingVersion', true, false, 'Separate parent capital, staffed insurance agency, facility networks and renovation, plus departmental workloads, paid outsourcing and bounded leadership.'],
  ['featureRulesVersion', 'Modular combinations', 1, 'productProgramsVersion', true, false, 'Independently select Advertising and Regional growth; offers, onboarding and Financial Group are not supported in this pilot.']
].map(([field, label, setupVersion, parent, visible, implicit, description]) => Object.freeze({
  field, label, setupVersion, visible, implicit, description, maturity: 'preview',
  available: field !== 'featureRulesVersion' || MODULAR_FEATURE_RULES_AVAILABLE,
  peers: Object.freeze(CAMPAIGN_PEER_REQUIREMENTS.filter(peer => peer.field === field)),
  versions: Object.freeze(field==='financialGroupVersion'?[0,1,2,3,4,5,6,7,8]:['managementVersion', 'customerDemandVersion', 'productProgramsVersion'].includes(field) ? [0, 1, 2] : [0, 1]),
  requires: Object.freeze(field==='financialGroupVersion' ? [Object.freeze({field:'onboardingVersion',version:1}),Object.freeze({field:'productProgramsVersion',version:2})] : parent ? [Object.freeze({ field: parent, version: ['customerDemandVersion', 'workforceVersion'].includes(field) ? 2 : 1 })] : [])
})));
const CAMPAIGN_FEATURE_FIELDS = Object.freeze(CAMPAIGN_FEATURES.map(row => row.field));
const CAMPAIGN_LEGACY_VERSIONS = Object.freeze(['6.0', '7.0', '7.1', '8.0', '8.1', '8.2', '8.3', '8.4', '8.5', '8.6', '8.7', '8.8', '8.9', '8.10', '8.11', '8.12', '8.13']);
const CAMPAIGN_VERSION_STAGES = Object.freeze([
  ['onboardingVersion', 1, '8.13'], ['relationshipOffersVersion', 1, '8.12'], ['regionalGrowthVersion', 1, '8.11'],
  ['advertisingVersion', 1, '8.10'], ['productProgramsVersion', 1, '8.9'], ['segmentDepositsVersion', 1, '8.8'],
  ['creditPerformanceVersion', 1, '8.7'], ['customerOwnershipVersion', 1, '8.6'], ['workforceVersion', 1, '8.5'],
  ['customerDemandVersion', 2, '8.4'], ['customerDemandVersion', 1, '8.3'], ['managementVersion', 2, '8.2'], ['managementVersion', 1, '8.2']
].map(Object.freeze));
// Legacy creation checks deliberately keep their historical order and wording.
const CAMPAIGN_OPTION_ERRORS = Object.freeze([
  ['customerDemandVersion', 'customer demand version'], ['onboardingVersion', 'onboarding version'],
  ['relationshipOffersVersion', 'relationship offers version'], ['regionalGrowthVersion', 'regional growth version'],
  ['advertisingVersion', 'advertising version'], ['productProgramsVersion', 'product programmes version'],
  ['segmentDepositsVersion', 'segment deposit version'], ['creditPerformanceVersion', 'credit performance version'],
  ['customerOwnershipVersion', 'household ownership version'], ['workforceVersion', 'specialist workforce version'],
  ['managementVersion', 'institution management'], ['serviceExpansionVersion', 'service expansion'],
  ['contractRulesVersion', 'service contracts'], ['productDeploymentVersion', 'product deployment'],
  ['retailLifecycleVersion', 'retail lifecycle'], ['termFundingVersion', 'term funding'], ['depositProductsVersion', 'deposit products'],
  ['fundingCovenantVersion', 'funding covenant'], ['creditLifecycleVersion', 'credit lifecycle'],
  ['marketEconomyVersion', 'market economy'], ['regionalEconomyVersion', 'regional economy version'], ['campaignRulesVersion', 'campaign rules'],
  ['featureRulesVersion', 'modular feature rules version'], ['financialGroupVersion', 'financial group version']
].map(Object.freeze));
function campaignFeature(field) { return CAMPAIGN_FEATURES.find(row => row.field === field); }
function campaignVersion(source) {
  if (source.financialGroupVersion===8) return '9.7';
  if (source.financialGroupVersion===7) return '9.6';
  if (source.financialGroupVersion===6) return '9.5';
  if (source.financialGroupVersion===5) return '9.4';
  if (source.financialGroupVersion===4) return '9.3';
  if (source.financialGroupVersion===3) return '9.2';
  if ([1,2].includes(source.financialGroupVersion)) return source.financialGroupVersion===2?'9.1':'9.0';
  if (source.productProgramsVersion === 2) return '8.15';
  if (MODULAR_FEATURE_RULES_AVAILABLE && source.featureRulesVersion === 1) return '8.14';
  return CAMPAIGN_VERSION_STAGES.find(([field, value]) => source[field] === value)?.[2] || '8.1';
}
function campaignVersionSupported(version) {
  return ['9.0','9.1','9.2','9.3','9.4','9.5','9.6','9.7'].includes(version) || CAMPAIGN_LEGACY_VERSIONS.includes(version) || version === '8.15' || (MODULAR_FEATURE_RULES_AVAILABLE && version === '8.14');
}
function campaignOptionIssues(source, context) {
  const issues = [];
  for (const [field, name] of CAMPAIGN_OPTION_ERRORS) {
    const value = source[field], def = campaignFeature(field);
    if (value === undefined) continue;
    const allowed = field === 'campaignRulesVersion' && context === 'creation' ? [1] : def.versions;
    if (!allowed.includes(value) || (field === 'featureRulesVersion' && value === 1 && !MODULAR_FEATURE_RULES_AVAILABLE))
      issues.push({ field, code: 'unsupported_version', message: 'Unsupported ' + name });
    else if (['game', 'view'].includes(context) && value === 0)
      issues.push({ field, code: 'disabled_state_version', message: 'Disabled campaign features must omit their saved version: ' + def.label + '.' });
  }
  return issues;
}
function validateCampaignCreationValues(source) {
  const issue = campaignOptionIssues(source, 'creation')[0];
  if (issue) throw Error(issue.message);
}
function campaignRequirements(def, modular = false) {
  if (modular && def.field === 'regionalGrowthVersion') return [{ field: 'productProgramsVersion', version: 1 }];
  return def.requires;
}
function campaignRules(source, { context = 'creation' } = {}) {
  if (!source || typeof source !== 'object' || Array.isArray(source)) throw Error('Invalid campaign rules source.');
  if (!['creation', 'lobby', 'game', 'view'].includes(context)) throw Error('Unknown campaign rules context.');
  const issues = campaignOptionIssues(source, context), versions = {}, saved = ['game', 'view'].includes(context);
  const modular = MODULAR_FEATURE_RULES_AVAILABLE && source.featureRulesVersion === 1;
  for (const def of CAMPAIGN_FEATURES) {
    const requirements = campaignRequirements(def, modular);
    const available = requirements.every(r => versions[r.field] >= r.version);
    versions[def.field] = source[def.field] === undefined ? (!saved && def.implicit && available ? def.setupVersion : 0) : source[def.field];
    if (versions[def.field] > 0) for (const needed of requirements) {
      if (!(versions[needed.field] >= needed.version)) issues.push({ field: def.field, code: 'missing_dependency',
        message: def.label + ' requires ' + campaignFeature(needed.field).label + '.' });
    }
  }
  if (modular) for (const field of ['relationshipOffersVersion', 'onboardingVersion', 'financialGroupVersion']) if (versions[field] > 0)
    issues.push({ field, code: 'unsupported_combination', message: campaignFeature(field).label + ' is not supported in the Modular combinations preview.' });
  if (saved) {
    if (!campaignVersionSupported(source.version)) issues.push({ field: 'version', code: 'unsupported_save', message: 'Unsupported campaign save version.' });
    else if ((source.featureRulesVersion === 1 || source.version === '8.14') && (!modular || source.version !== (source.productProgramsVersion === 2 ? '8.15' : '8.14')))
      issues.push({ field: 'featureRulesVersion', code: 'rules_marker_mismatch', message: 'Modular combinations requires matching v8.14 campaign rules.' });
    else if ((Object.values(versions).some(v => v > 0) || !['6.0', '7.0', '7.1', '8.0'].includes(source.version)) && source.version !== campaignVersion(versions))
      issues.push({ field: 'version', code: 'save_version_mismatch', message: 'Campaign version does not match its enabled features.' });
  }
  const fundingRulesVersion = versions.campaignRulesVersion === 1 ? 2 : source.fundingRulesVersion === undefined ? (saved ? 1 : 2) : source.fundingRulesVersion;
  if (![1, 2].includes(fundingRulesVersion) || (saved && versions.campaignRulesVersion === 1 && source.fundingRulesVersion !== 2))
    issues.push({ field: 'fundingRulesVersion', code: 'funding_version', message: 'Unsupported or inconsistent funding rules version.' });
  const options = Object.fromEntries(Object.entries(versions).filter(([field, value]) => !(['campaignRulesVersion', 'featureRulesVersion'].includes(field) && !value)));
  options.fundingRulesVersion = fundingRulesVersion;
  return { context, featureRulesVersion: modular ? 1 : 0, version: campaignVersion(versions), options,
    enabled: CAMPAIGN_FEATURE_FIELDS.filter(field => versions[field] > 0),
    features: CAMPAIGN_FEATURES.map(def => ({ ...def, requires: campaignRequirements(def, modular), enabled: versions[def.field] > 0, version: versions[def.field],
      available: def.available && !(modular && ['relationshipOffersVersion', 'onboardingVersion', 'financialGroupVersion'].includes(def.field)),
      disabledReason: modular && ['relationshipOffersVersion', 'onboardingVersion', 'financialGroupVersion'].includes(def.field) ? 'Not supported in the Modular combinations preview.' : '' })),
    issues, valid: issues.length === 0, signature: JSON.stringify({ versions, fundingRulesVersion }) };
}
function validateCampaignRules(source, context = 'creation') {
  const rules = campaignRules(source, { context });
  if (!rules.valid) throw Error(rules.issues[0].message);
  return rules;
}
function previewFeatureSelection(source, { field, value }) {
  const selected = campaignFeature(field);
  if (!selected || !selected.visible || !selected.available || !selected.versions.includes(value)) throw Error('Unsupported setup feature choice.');
  const options = { ...source }, before = campaignRules(source, { context: 'lobby' });
  const set = (key, next) => { if (key === 'campaignRulesVersion' && next === 0) delete options[key]; else options[key] = next; };
  set(field, value);
  const modular = MODULAR_FEATURE_RULES_AVAILABLE && options.featureRulesVersion === 1;
  if (modular && value && ['relationshipOffersVersion', 'onboardingVersion', 'financialGroupVersion'].includes(field)) throw Error('This feature is not supported in the Modular combinations preview.');
  function enable(key, minimum) {
    const def = campaignFeature(key);
    if (!(options[key] >= minimum)) set(key, Math.max(minimum, def.setupVersion));
    for (const needed of campaignRequirements(def, modular)) enable(needed.field, needed.version);
  }
  if (value) enable(field, value);
  if (modular) for (const key of ['relationshipOffersVersion', 'onboardingVersion', 'financialGroupVersion']) set(key, 0);
  // Leaving the independent profile preserves the selected economy by proposing
  // the legacy Advertising prerequisite, never silently discarding Growth.
  if (field === 'featureRulesVersion' && !value && source.featureRulesVersion === 1 && options.regionalGrowthVersion === 1)
    enable('advertisingVersion', 1);
  // Disabling a prerequisite removes dependants, never silently enables it again.
  // The resolver includes legacy implicit book dependencies for this fixed point.
  if (!value) {
    let changed;
    do {
      changed = false;
      const resolved = campaignRules(options, { context: 'lobby' });
      for (const issue of resolved.issues.filter(item => item.code === 'missing_dependency')) {
        if (options[issue.field] !== 0) { set(issue.field, 0); changed = true; }
      }
    } while (changed);
  }
  const rules = campaignRules(options, { context: 'lobby' });
  const changes = rules.features.filter(def => def.version !== before.features.find(old => old.field === def.field).version)
    .map(def => ({ field: def.field, label: def.label, from: before.features.find(old => old.field === def.field).version, to: def.version,
      reason: def.field === field ? 'selected' : def.version ? 'required dependency' : 'dependent feature disabled' }));
  return { options, rules, changes, requiresConfirmation: changes.some(change => change.field !== field) };
}
function campaignCapabilities() {
  return { lobbySupported: 1, ...Object.fromEntries(CAMPAIGN_FEATURES.filter(def => def.available)
    .flatMap(def => def.peers.map(peer => [peer.capability, peer.supported]))) };
}
function campaignNeedsFreshHandshake(source) {
  return source.featureRulesVersion===1||source.productProgramsVersion===2;
}
function peerRulesIssue(rules, capabilities = {}) {
  if (!rules || !rules.options || !Array.isArray(rules.issues)) throw Error('Resolve campaign rules before checking a peer.');
  if (!rules.valid) return { ...rules.issues[0], status: 'CAMPAIGN RULES REFUSED' };
  const values = rules.options;
  const checks = CAMPAIGN_FEATURES.filter(def => def.available).flatMap(def => def.peers).sort((a, b) => a.order - b.order);
  for (const { field, capability, supported, minimum, range, label, status } of checks) {
    if (!(values[field] >= minimum)) continue;
    const compatible = range ? Number.isInteger(capabilities[capability]) && capabilities[capability] >= values[field] && capabilities[capability] <= supported : capabilities[capability] === supported;
    if (!compatible) return { field, code: 'unsupported_peer', message: label + ' requires the updated game on both computers.',
      status: status + ' LINK REFUSED' + (field === 'campaignRulesVersion' ? ' // Update the rival game file.' : '') };
  }
  return null;
}
