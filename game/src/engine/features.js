// Campaign rules are derived from the existing version scalars. This catalog
// owns compatibility and setup choices, not simulation order or private books.
// Setup offers Core and Expanded. This flag controls discovery/selection only:
// historical modular 8.14/8.15 campaigns still require their exact rules for
// import, rematch and multiplayer recovery. Availability is not compatibility.
const MODULAR_FEATURE_RULES_AVAILABLE = false;
const CAMPAIGN_PEER_REQUIREMENTS = Object.freeze([
  ['researchProgramVersion', 'researchProgramSupported', 1, 1, 'Core research programme', 'RESEARCH PROGRAMME'],
  ['bankRivalryVersion', 'bankRivalrySupported', 1, 1, 'Persistent bank rivalry', 'BANK RIVALRY'],
  ['bankEconomicsVersion', 'bankEconomicsSupported', 1, 1, 'Service-based bank economics', 'BANK ECONOMICS'],
  ['bankEconomicsVersion', 'coreAccountingSupported', 1, 2, 'Core balance-sheet accounting', 'CORE ACCOUNTING'],
  ['creditWorkloadVersion', 'creditWorkloadSupported', 1, 1, 'Portfolio-based credit administration', 'CREDIT WORKLOAD'],
  ['commercialServiceVersion', 'commercialServiceSupported', 1, 1, 'Serviced commercial income', 'COMMERCIAL SERVICING'],
  ['incomeHistoryVersion', 'incomeHistorySupported', 1, 1, 'Persistent income reporting', 'INCOME HISTORY'],
  ['companyCreditVersion', 'companyCreditSupported', 1, 1, 'Named-company lending', 'COMPANY CREDIT'],
  ['sharedPremisesVersion', 'sharedPremisesSupported', 1, 1, 'Shared service premises', 'SHARED PREMISES'],
  ['companyControlStrategyVersion', 'companyControlStrategySupported', 1, 1, 'Competitive company strategy', 'COMPANY STRATEGY'],
  ['companyConsolidationVersion', 'companyConsolidationSupported', 1, 1, 'Controlled company reporting', 'COMPANY CONSOLIDATION'],
  ['companyControlVersion', 'companyControlSupported', 1, 1, 'Reviewed company control', 'COMPANY CONTROL'],
  ['companySharesVersion', 'companySharesSupported', 1, 1, 'Company share ownership', 'COMPANY SHARES'],
  ['investmentStrategyVersion', 'investmentStrategySupported', 1, 1, 'Investment business strategy', 'GROUP STRATEGY'],
  ['creditProductsVersion', 'creditProductsSupported', 1, 1, 'Expanded lending portfolios', 'LENDING PRODUCTS'],
  ['investmentNotesVersion', 'investmentNotesSupported', 1, 1, 'Fixed-term investment notes', 'INVESTMENT NOTES'],
  ['investmentTradingVersion', 'investmentTradingSupported', 1, 1, 'Client portfolio orders', 'INVESTMENT TRADING'],
  ['investmentSuitabilityVersion', 'investmentSuitabilitySupported', 1, 1, 'Customer investment mandates', 'INVESTMENT SUITABILITY'],
  ['investmentIncomeVersion', 'investmentIncomeSupported', 1, 1, 'Funded investment distributions', 'INVESTMENT INCOME'],
  ['investmentChoiceVersion', 'investmentChoiceSupported', 1, 1, 'Investment customer preferences', 'INVESTMENT CHOICE'],
  ['investmentSweepVersion', 'investmentSweepSupported', 1, 1, 'Standing investment cash arrangements', 'INVESTMENT SWEEPS'],
  ['investmentCashVersion', 'investmentCashSupported', 1, 1, 'Investment cash withdrawals', 'INVESTMENT CASH'],
  ['investmentAssetsVersion', 'investmentAssetsSupported', 1, 1, 'Backed investment assets', 'INVESTMENT ASSETS'],
  ['investmentServicesVersion', 'investmentServicesSupported', 1, 1, 'Investment services', 'INVESTMENT SERVICES'],
  ['facilityExtensionsVersion', 'facilityExtensionsSupported', 1, 1, 'Adaptable office suites', 'OFFICE SUITES'],
  ['commercialAccountsVersion', 'commercialAccountsSupported', 2, 1, 'Business operating accounts', 'BUSINESS ACCOUNTS'],
  ['financialGroupVersion', 'financialGroupSupported', 10, 1, 'Financial Group preview', 'FINANCIAL GROUP'],
  ['financialGroupVersion', 'departmentStaffingSupported', 2, 6, 'Frozen department staffing evidence', 'DEPARTMENT STAFFING'],
  ['financialGroupVersion', 'projectLocationsSupported', 1, 10, 'Independent construction locations', 'CONSTRUCTION LOCATIONS'],
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
  ['financialGroupVersion', 'Financial Group preview', 10, 'onboardingVersion', true, false, 'Separate parent capital, qualified agency producers and servicing staff, ongoing operating permissions, facilities sharing a finite workforce, departmental workloads and bounded leadership.'],
  ['commercialAccountsVersion', 'Business operating accounts', 1, 'financialGroupVersion', true, false, 'Qualified named-company cash accounts, dedicated work and conserved bank funding.'],
  ['facilityExtensionsVersion', 'Adaptable office suites', 1, 'commercialAccountsVersion', true, false, 'Commercial services within existing premises, sharing real staff, construction and upkeep.'],
  ['investmentServicesVersion', 'Investment services', 1, 'facilityExtensionsVersion', false, false, 'Qualified investment institutions and funded customer accounts.'],
  ['investmentAssetsVersion', 'Backed investment assets', 1, 'investmentServicesVersion', false, false, 'Dealer inventory purchased from existing bank securities, using funded counterparties.'],
  ['investmentCashVersion', 'Investment cash withdrawals', 1, 'investmentAssetsVersion', false, false, 'Client cash returned to an existing bank deposit account.'],
  ['investmentSweepVersion', 'Standing investment cash arrangements', 1, 'investmentCashVersion', false, false, 'Customer-directed affiliated deposits, external bank deposits and money-market fund placements.'],
  ['investmentChoiceVersion', 'Investment customer preferences', 1, 'investmentSweepVersion', false, false, 'Persistent customer priorities, delivery quality, fees and earned relationship continuity.'],
  ['investmentIncomeVersion', 'Funded investment distributions', 1, 'investmentChoiceVersion', false, false, 'Variable cash-funded security income and customer-owned fund earnings.'],
  ['investmentSuitabilityVersion', 'Customer investment mandates', 1, 'investmentIncomeVersion', false, false, 'Persistent liquidity needs constrain funded securities purchases and fund allocations.'],
  ['investmentTradingVersion', 'Client portfolio orders', 1, 'investmentSuitabilityVersion', false, false, 'Qualified, cash-funded purchases and sales of existing client securities.'],
  ['investmentNotesVersion', 'Fixed-term investment notes', 1, 'investmentTradingVersion', false, false, 'Client-funded fixed coupons, maturity obligations and issuer liquidity risk.'],
  ['creditProductsVersion', 'Expanded lending portfolios', 1, 'investmentNotesVersion', false, false, 'Small-business and commercial-property lending with retained terms, collateral and concentration risk.'],
  ['investmentStrategyVersion', 'Investment business strategy', 1, 'creditProductsVersion', false, false, 'Funded rival diversification, qualified servicing, portfolio mandates and deliberate wind-down.'],
  ['companySharesVersion', 'Company share ownership', 1, 'investmentStrategyVersion', false, false, 'Parent-funded company auctions, separate ownership, dividends and thin outside liquidity.'],
  ['companyControlVersion', 'Reviewed company control', 1, 'companySharesVersion', false, false, 'Paid diligence, funded control offers, acquisition debt and persistent integration.'],
  ['companyConsolidationVersion', 'Controlled company reporting', 1, 'companyControlVersion', false, false, 'Acquisition-date accounts, outside shareholders and reconciled internal balances.'],
  ['companyControlStrategyVersion', 'Competitive company strategy', 1, 'companyConsolidationVersion', false, false, 'Funded opponent control decisions and explicit responses to shareholder offers.'],
  ['sharedPremisesVersion', 'Shared service premises', 1, 'companyControlStrategyVersion', false, false, 'Paid multi-entity office extensions, qualified local delivery and reconciled occupancy.'],
  ['companyCreditVersion', 'Named-company lending', 1, 'sharedPremisesVersion', false, false, 'Qualified company credit, actual lender funding, persistent repayment and conserved operating deposits.'],
  ['featureRulesVersion', 'Modular combinations', 1, 'productProgramsVersion', true, false, 'Independently select Advertising and Regional growth; offers, onboarding and Financial Group are not supported in this pilot.'],
  ['incomeHistoryVersion', 'Persistent income reporting', 1, null, false, false, 'Twelve completed months of private income, relationship and principal records retained independently of diagnostic logs.'],
  ['commercialServiceVersion', 'Serviced commercial income', 1, 'incomeHistoryVersion', false, false, 'Opening relationships earn fees only through finite servicing; operating-step acquisitions start earning next month.'],
  ['creditWorkloadVersion', 'Portfolio-based credit administration', 1, 'commercialServiceVersion', false, false, 'Loan administration follows principal and product-location portfolios rather than internal cohort fragmentation.'],
  ['bankEconomicsVersion', 'Service-based bank economics', 1, 'commercialServiceVersion', false, false, 'Income comes from earning assets and delivered services, not automatic staff or upgrade bonuses; shared base payroll is $12K per banker per month.'],
  ['bankRivalryVersion', 'Persistent bank rivalry', 1, 'bankEconomicsVersion', false, false, 'Market dominance and score advantages do not automatically end the campaign. Institutional failure remains consequential; company acquisitions still require funded transactions.'],
  ['researchProgramVersion', 'Core research programme', 1, 'bankEconomicsVersion', false, false, 'Six capability branches with three permanent operating models each. Research is shared knowledge; the operating model decides how the bank applies it, and gates the products and platforms it can run.']
].map(([field, label, setupVersion, parent, visible, implicit, description]) => Object.freeze({
  field, label, setupVersion, visible, implicit, description, maturity: 'preview',
  available: field !== 'featureRulesVersion' || MODULAR_FEATURE_RULES_AVAILABLE,
  peers: Object.freeze(CAMPAIGN_PEER_REQUIREMENTS.filter(peer => peer.field === field)),
  versions: Object.freeze(field==='financialGroupVersion'?[0,1,2,3,4,5,6,7,8,9,10]:['bankEconomicsVersion', 'managementVersion', 'customerDemandVersion', 'productProgramsVersion'].includes(field) ? [0, 1, 2] : [0, 1]),
  requires: Object.freeze(field==='creditWorkloadVersion'?[Object.freeze({field:'commercialServiceVersion',version:1}),Object.freeze({field:'companyCreditVersion',version:1})]:field==='commercialAccountsVersion'?[Object.freeze({field:'financialGroupVersion',version:10})]:field==='financialGroupVersion' ? [Object.freeze({field:'onboardingVersion',version:1}),Object.freeze({field:'productProgramsVersion',version:2})] : parent ? [Object.freeze({ field: parent, version: ['customerDemandVersion', 'workforceVersion'].includes(field) ? 2 : 1 })] : [])
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
  ['companyCreditVersion', 'named-company credit version'],
  ['bankRivalryVersion', 'bank rivalry version'],
  ['researchProgramVersion', 'research programme version'],
  ['incomeHistoryVersion', 'income history version'],
  ['commercialServiceVersion', 'commercial servicing version'],
  ['creditWorkloadVersion', 'credit workload version'],
  ['bankEconomicsVersion', 'bank economics version'],
  ['sharedPremisesVersion', 'shared service premises version'],
  ['companyControlStrategyVersion', 'competitive company strategy version'],
  ['companyConsolidationVersion', 'controlled company reporting version'],
  ['companyControlVersion', 'reviewed company control version'],
  ['companySharesVersion', 'company share ownership version'],
  ['investmentStrategyVersion', 'investment business strategy version'],
  ['creditProductsVersion', 'expanded lending products version'],
  ['investmentNotesVersion', 'investment notes version'],
  ['investmentTradingVersion', 'investment trading version'],
  ['investmentSuitabilityVersion', 'investment suitability version'],
  ['investmentIncomeVersion', 'investment income version'],
  ['investmentChoiceVersion', 'investment customer choice version'],
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
  ['featureRulesVersion', 'modular feature rules version'], ['financialGroupVersion', 'financial group version'], ['commercialAccountsVersion','business operating accounts version'], ['facilityExtensionsVersion','office extension version'], ['investmentServicesVersion','investment services version'], ['investmentAssetsVersion','investment assets version'], ['investmentCashVersion','investment cash version'], ['investmentSweepVersion','investment sweep version']
].map(Object.freeze));
function campaignFeature(field) { return CAMPAIGN_FEATURES.find(row => row.field === field); }
function campaignVersion(source) {
  if(source.researchProgramVersion===1)return '8.20';
  if(source.bankRivalryVersion===1)return '9.33';
  if(source.bankEconomicsVersion===2)return '8.19';
  if(source.bankEconomicsVersion===1)return source.companyCreditVersion===1?'9.32':'8.18';
  if(source.creditWorkloadVersion===1)return '9.31';
  if(source.commercialServiceVersion===1)return source.companyCreditVersion===1?'9.30':'8.17';
  if(source.incomeHistoryVersion===1)return source.companyCreditVersion===1?'9.29':'8.16';
  if(source.companyCreditVersion===1)return '9.28';
  if(source.sharedPremisesVersion===1)return '9.27';
  if(source.companyControlStrategyVersion===1)return '9.26';
  if(source.companyConsolidationVersion===1)return '9.25';
  if(source.companyControlVersion===1)return '9.24';
  if(source.companySharesVersion===1)return '9.23';
  if(source.investmentStrategyVersion===1)return '9.22';
  if(source.creditProductsVersion===1)return '9.21';
  if(source.investmentNotesVersion===1)return '9.20';
  if(source.investmentTradingVersion===1)return '9.19';
  if(source.investmentSuitabilityVersion===1)return '9.18';
  if(source.investmentIncomeVersion===1)return '9.17';
  if(source.investmentChoiceVersion===1)return '9.16';
  if(source.investmentSweepVersion===1)return '9.15';
  if(source.investmentCashVersion===1)return '9.14';
  if(source.investmentAssetsVersion===1)return '9.13';
  if(source.investmentServicesVersion===1)return '9.12';
  if(source.facilityExtensionsVersion===1)return '9.11';
  if(source.commercialAccountsVersion===1)return '9.10';
  if (source.financialGroupVersion===10) return '9.9';
  if (source.financialGroupVersion===9) return '9.8';
  if (source.financialGroupVersion===8) return '9.7';
  if (source.financialGroupVersion===7) return '9.6';
  if (source.financialGroupVersion===6) return '9.5';
  if (source.financialGroupVersion===5) return '9.4';
  if (source.financialGroupVersion===4) return '9.3';
  if (source.financialGroupVersion===3) return '9.2';
  if ([1,2].includes(source.financialGroupVersion)) return source.financialGroupVersion===2?'9.1':'9.0';
  if (source.productProgramsVersion === 2) return '8.15';
  if (source.featureRulesVersion === 1) return '8.14';
  return CAMPAIGN_VERSION_STAGES.find(([field, value]) => source[field] === value)?.[2] || '8.1';
}
function campaignVersionSupported(version) {
  if(version==='9.33')return true;
  if(version==='8.20'||version==='8.19'||version==='8.18'||version==='9.32')return true;
  if(version==='9.31')return true;
  if(version==='8.17'||version==='9.30')return true;
  if(version==='8.16'||version==='9.29')return true;
  if(version==='9.28')return true;
  if(version==='9.27')return true;
  return ['9.0','9.1','9.2','9.3','9.4','9.5','9.6','9.7','9.8','9.9','9.10','9.11','9.12','9.13','9.14','9.15','9.16','9.17','9.18','9.19','9.20','9.21','9.22','9.23','9.24','9.25','9.26'].includes(version) || CAMPAIGN_LEGACY_VERSIONS.includes(version) || ['8.14','8.15'].includes(version);
}
function campaignOptionIssues(source, context) {
  const issues = [];
  for (const [field, name] of CAMPAIGN_OPTION_ERRORS) {
    const value = source[field], def = campaignFeature(field);
    if (value === undefined) continue;
    const allowed = field === 'campaignRulesVersion' && context === 'creation' ? [1] : def.versions;
    if (!allowed.includes(value))
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
  const modular = source.featureRulesVersion === 1;
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
  if(versions.bankEconomicsVersion===2&&(versions.campaignRulesVersion>0||versions.companyCreditVersion>0||source.fundingRulesVersion===1))
    issues.push({field:'bankEconomicsVersion',code:'unsupported_combination',message:'Core balance-sheet economics requires Core with funding rules 2.'});
  if(versions.bankEconomicsVersion===1&&versions.companyCreditVersion===1&&versions.creditWorkloadVersion!==1)
    issues.push({field:'bankEconomicsVersion',code:'missing_dependency',message:'Expanded bank economics requires Portfolio-based credit administration.'});
  if(versions.researchProgramVersion===1&&versions.bankEconomicsVersion!==2)
    issues.push({field:'researchProgramVersion',code:'unsupported_combination',message:'The research programme requires Core balance-sheet economics.'});
  if(versions.bankRivalryVersion===1&&(versions.bankEconomicsVersion!==1||versions.companyCreditVersion!==1))
    issues.push({field:'bankRivalryVersion',code:'unsupported_combination',message:'Persistent bank rivalry requires the complete current Expanded banking rules.'});
  if(versions.incomeHistoryVersion===1&&versions.companyCreditVersion!==1&&Object.entries(versions).some(([key,value])=>!['incomeHistoryVersion','commercialServiceVersion','bankEconomicsVersion','researchProgramVersion'].includes(key)&&value>0))
    issues.push({field:'incomeHistoryVersion',code:'unsupported_combination',message:'Persistent income reporting requires Core or the complete integrated Expanded rules.'});
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
  const modular = options.featureRulesVersion === 1;
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
  // Historical custom selections remain available without being upgraded. A
  // proposal that leaves the two reporting profiles explicitly includes removal
  // of the reporting marker in its confirmation; saved-state validation never
  // performs this adjustment.
  if (options.incomeHistoryVersion === 1 && campaignRules(options, { context: 'lobby' }).issues.some(issue => issue.field === 'incomeHistoryVersion' && issue.code === 'unsupported_combination')) {
    delete options.incomeHistoryVersion;
    delete options.commercialServiceVersion;
    delete options.creditWorkloadVersion;
    delete options.bankEconomicsVersion;
  }
  // The research programme is Core-only. A modular selection that moves the
  // campaign off Core economics used to make the whole proposal INVALID, which
  // stopped the dependent-feature confirmation flow from engaging at all. Drop
  // the marker instead, exactly as the reporting markers above are dropped, so a
  // default new-game draft can carry it safely.
  if (options.researchProgramVersion === 1 && options.bankEconomicsVersion !== 2)
    delete options.researchProgramVersion;
  const rules = campaignRules(options, { context: 'lobby' });
  const changes = rules.features.filter(def => def.version !== before.features.find(old => old.field === def.field).version)
    .map(def => ({ field: def.field, label: def.label, from: before.features.find(old => old.field === def.field).version, to: def.version,
      reason: def.field === field ? 'selected' : def.version ? 'required dependency' : 'dependent feature disabled' }));
  return { options, rules, changes, requiresConfirmation: changes.some(change => change.field !== field) };
}
// New-campaign edition selection only. Saved campaigns retain their authoritative
// scalar versions; this proposal never migrates books or creates subsidiaries.
function previewCampaignEdition(source, edition, { currentReporting = false, currentEconomics = false, currentRivalry = false, currentResearch = false } = {}) {
  if (!['core', 'expanded'].includes(edition)) throw Error('Unknown campaign edition.');
  const before = campaignRules(source, { context: 'lobby' });
  let options;
  if (edition === 'core') options = previewFeatureSelection(source, { field: 'campaignRulesVersion', value: 0 }).options;
  else {
    options = { ...source };
    if (options.featureRulesVersion) options.featureRulesVersion = 0;
    const enableEditionPrerequisite = field => {
      const def = campaignFeature(field);
      options[field] = def.setupVersion;
      for (const required of campaignRequirements(def, false)) enableEditionPrerequisite(required.field);
    };
    enableEditionPrerequisite('companyCreditVersion');
  }
  // The player-facing setup opts into current reporting. Preserve this API's
  // historical default for explicit old-rule construction and replay tools.
  if (currentReporting) options.incomeHistoryVersion = 1;
  // Explicit new-game/lobby choice, never a saved-state upgrade. Keep the
  // reporting-only API stable for historical configurations and replay tools.
  if (currentEconomics) {
    options.incomeHistoryVersion=1;
    options.commercialServiceVersion=1;
    options.bankEconomicsVersion=edition==='core'?2:1;
    if(edition==='expanded')options.creditWorkloadVersion=1;
    else delete options.creditWorkloadVersion;
  }
  // Explicit new setup only. Old creation calls, imports and rematches keep
  // their ending rules; the UI has no additional complexity checkbox.
  if(currentRivalry&&edition==='expanded')options.bankRivalryVersion=1;
  if(edition==='core')delete options.bankRivalryVersion;
  if(currentResearch&&currentEconomics&&edition==='core')options.researchProgramVersion=1;
  if(edition!=='core'||!currentResearch)delete options.researchProgramVersion;
  const rules = validateCampaignRules(options, 'lobby');
  const changes = rules.features.filter(def => def.version !== before.features.find(old => old.field === def.field).version)
    .map(def => ({ field: def.field, label: def.label, from: before.features.find(old => old.field === def.field).version, to: def.version, reason: 'edition selection' }));
  return { options, rules, changes, requiresConfirmation: changes.length > 0 };
}
function campaignCapabilities() {
  return { lobbySupported: 1, ...Object.fromEntries(CAMPAIGN_FEATURES
    .flatMap(def => def.peers.map(peer => [peer.capability, peer.supported]))) };
}
function campaignNeedsFreshHandshake(source) {
  return source.incomeHistoryVersion===1||source.featureRulesVersion===1||source.productProgramsVersion===2;
}
function peerRulesIssue(rules, capabilities = {}) {
  if (!rules || !rules.options || !Array.isArray(rules.issues)) throw Error('Resolve campaign rules before checking a peer.');
  if (!rules.valid) return { ...rules.issues[0], status: 'CAMPAIGN RULES REFUSED' };
  const values = rules.options;
  const checks = CAMPAIGN_FEATURES.flatMap(def => def.peers).sort((a, b) => a.order - b.order);
  for (const { field, capability, supported, minimum, range, label, status } of checks) {
    if (!(values[field] >= minimum)) continue;
    const compatible = range ? Number.isInteger(capabilities[capability]) && capabilities[capability] >= values[field] && capabilities[capability] <= supported : capabilities[capability] === supported;
    if (!compatible) return { field, code: 'unsupported_peer', message: label + ' requires the updated game on both computers.',
      status: status + ' LINK REFUSED' + (field === 'campaignRulesVersion' ? ' // Update the rival game file.' : '') };
  }
  return null;
}
