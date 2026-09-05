const SCOPES={town:{name:'TOWN CAMPAIGN',maxTier:0},regional:{name:'REGIONAL CAMPAIGN',maxTier:1},state:{name:'STATEWIDE CAMPAIGN',maxTier:2},national:{name:'NATIONAL LEGACY CAMPAIGN',maxTier:3}};
const CAMPAIGN_ACTS=[
 {key:'rivalry',roman:'ACT I',name:'LOCAL RIVALRY',text:'Build the franchise and establish defensible market positions.',pressure:1,depositCap:.025},
 {key:'expansion',roman:'ACT II',name:'REGIONAL EXPANSION',text:'Strategic platforms intensify competition and weak franchises begin to retreat.',pressure:1.25,depositCap:.045},
 {key:'consolidation',roman:'ACT III',name:'CONSOLIDATION WAR',text:'Markets can be lost permanently, funding runs accelerate, and vulnerable rivals face a buyout.',pressure:1.55,depositCap:.075}
];
const SCENARIOS={balanced:'BALANCED ECONOMY',rate:'RATE SHOCK',regulatory:'REGULATORY SIEGE',growth:'GROWTH FRENZY'};
const ROLES={service:{name:'Retail & Service',desc:'Households, deposits, reputation'},business:{name:'Business Banking',desc:'Business, treasury, merchant'},lending:{name:'Lending',desc:'Loan production and revenue'},operations:{name:'Operations & Risk',desc:'Controls and project execution'}};
const DEPOSIT_POLICIES={margin:{name:'Protect Margin',desc:'Stable funding, slower acquisition, strongest spread'},balanced:{name:'Balanced',desc:'Steady growth, moderate funding cost and runoff'},aggressive:{name:'Win Deposits',desc:'Fast growth with high funding cost and rate-sensitive runoff'}};
const LENDING_POLICIES={conservative:{name:'Conservative',desc:'Lower volume and risk'},balanced:{name:'Balanced',desc:'Measured loan growth'},growth:{name:'Growth',desc:'High volume and higher risk'}};
const CAPITAL_POLICIES={liquid:{name:'Build Liquidity',desc:'Hold cash, slow expansion, absorb shocks'},balanced:{name:'Balanced',desc:'Fund steady growth with normal buffers'},reinvest:{name:'Reinvest',desc:'Accelerate growth at higher liquidity risk'}};
const PRODUCT_PORTFOLIOS={
 retail:{name:'RETAIL FRANCHISE',options:{essential:{name:'Essential Banking',desc:'Low-fee accounts build loyalty and households; slower balance growth.',customers:1.2,deposits:.98,funding:.9,reputation:1},rewards:{name:'Rewards Checking',desc:'Card rewards improve acquisition and digital engagement at a moderate cost.',customers:1.08,deposits:1.05,funding:1.05,digital:1.15},highYield:{name:'High-Yield Savings',desc:'Rapid deposit growth, but expensive and highly rate-sensitive funding.',customers:.92,deposits:1.18,funding:1.2,sensitive:.16}}},
 business:{name:'BUSINESS BANKING',options:{relationship:{name:'Relationship Banking',desc:'More operating-company relationships and durable deposits.',business:1.16,merchant:1,deposits:1.04,fees:.96},treasury:{name:'Treasury Management',desc:'Merchant services and fee income grow faster; needs Business staffing.',business:1,merchant:1.16,fees:1.12},entrepreneur:{name:'Entrepreneur Platform',desc:'Faster relationship acquisition and digital adoption with more volatility.',business:1.1,merchant:1.08,digital:1.12,risk:1.06,fees:1}}},
 credit:{name:'CREDIT PORTFOLIO',options:{mortgage:{name:'Mortgage Franchise',desc:'Stable, lower-yield loan growth with reduced credit losses.',loans:.95,credit:.74,spread:.98},middleMarket:{name:'Middle-Market Lending',desc:'Balanced commercial production, yield, and underwriting risk.',loans:1.04,credit:1.03,spread:1.07},consumer:{name:'Consumer Finance',desc:'High-volume, high-yield production with greater losses and attention.',loans:1.2,credit:1.27,spread:1.16,attention:1}}}
};
const COMPETITIVE_ACTIONS={
 none:{name:'Hold Position',cost:0,kind:'neutral',desc:'Take no special competitive action this cycle.',counter:'None'},
 depositRaid:{name:'Targeted Deposit Campaign',cost:180000,kind:'attack',desc:'Concentrate pricing and outreach in the focus market. Digital and Acquisition strategy increase pressure.',counter:'Liquidity Defense'},
 commercialRaid:{name:'Commercial Client Raid',cost:220000,kind:'attack',desc:'Poach business, merchant, and household relationships. Commercial strategy increases the transfer.',counter:'Relationship Defense'},
 talentRaid:{name:'Talent Poach',cost:250000,kind:'attack',minInfluence:15,desc:'Attempt to recruit a rival banker. Acquisition strategy and influence improve the attempt.',counter:'Retention Package'},
 liquidityDefense:{name:'Liquidity Defense',cost:110000,kind:'defense',desc:'Protect vulnerable funding and blunt a targeted deposit campaign. Operations strategy strengthens it.',counter:'Counters Targeted Deposit Campaign'},
 relationshipDefense:{name:'Relationship Defense',cost:120000,kind:'defense',desc:'Deploy senior bankers to protect commercial and household relationships.',counter:'Counters Commercial Client Raid'},
 retentionDefense:{name:'Retention Package',cost:100000,kind:'defense',desc:'Protect staff and improve morale against a talent raid. People-first institutions gain extra resilience.',counter:'Counters Talent Poach'},
 takeoverDefense:{name:'Shareholder Defense',cost:260000,kind:'defense',minInfluence:12,desc:'Use influence and counsel to break a hostile-buyout position for this cycle.',counter:'Counters Hostile Buyout'}
};
const DOCTRINES={community:{name:'Community Franchise',desc:'Reputation and local market influence compound faster.'},commercial:{name:'Commercial Powerhouse',desc:'Business, merchant, and loan production receive a permanent edge.'},digital:{name:'Digital Challenger',desc:'Technology projects and digital adoption scale faster.'},efficiency:{name:'Efficiency Operator',desc:'Operating expenses fall and project execution improves.'},people:{name:'People-First Institution',desc:'Morale, training, and staff productivity are more resilient.'}};
const MACRO_REGIMES={expansion:{name:'BROAD EXPANSION',text:'Confidence and loan demand are strong; credit losses are subdued.',rate:4.25,demand:1.22,deposits:.92,credit:.72},steady:{name:'STEADY GROWTH',text:'Production and funding markets are broadly balanced.',rate:3.75,demand:1,deposits:1,credit:1},tight:{name:'TIGHT MONEY',text:'Funding is expensive and deposit competition is intense.',rate:6.25,demand:.88,deposits:1.28,credit:1.08},downturn:{name:'CREDIT DOWNTURN',text:'Borrowers are cautious and losses are climbing.',rate:3,demand:.72,deposits:.9,credit:1.65},recovery:{name:'EARLY RECOVERY',text:'Confidence is returning, but weak credits still require attention.',rate:3.5,demand:1.1,deposits:.96,credit:1.18}};
const CAPITAL_TIERS=[
 {key:'strong',min:8,name:'WELL CAPITALIZED',short:'WELL CAP',text:'No regulatory restrictions.'},
 {key:'watch',min:6,name:'ENHANCED SUPERVISION',short:'SUPERVISED',text:'Branch and acquisition projects are suspended.'},
 {key:'consent',min:4,name:'CONSENT ORDER',short:'CONSENT',text:'Deposit growth is capped and the loan book must shrink each cycle.'},
 {key:'critical',min:2,name:'UNDERCAPITALIZED',short:'UNDERCAP',text:'All new projects are barred and the franchise is visibly weakened.'},
 {key:'failing',min:-Infinity,name:'CRITICALLY UNDERCAPITALIZED',short:'FAILING',text:'Three consecutive cycles here forces receivership.'}
];
const RECEIVERSHIP_CYCLES=3;
const TERRITORIES={
 downtown:{name:'Downtown',tier:0,unlock:1,value:15,specialties:['service','corporate'],note:'Deposits + executive visibility'},
 northside:{name:'Northside',tier:0,unlock:1,value:15,specialties:['service','digital'],note:'Households + digital adoption'},
 industrial:{name:'Industrial Corridor',tier:0,unlock:1,value:18,specialties:['business'],note:'Treasury + merchant services'},
 suburbs:{name:'Suburban Growth Belt',tier:0,unlock:1,value:15,specialties:['lending','people'],note:'Consumer lending + staffing'},
 county_seat:{name:'County Seat',tier:1,unlock:5,value:20,specialties:['operations','corporate'],note:'Controls + public visibility'},
 university:{name:'University District',tier:1,unlock:5,value:18,specialties:['digital','people'],note:'Talent + technology'},
 metro_core:{name:'Metro Core',tier:2,unlock:10,value:24,specialties:['service','business'],note:'Commercial + wealth scale'},
 state_capital:{name:'State Capital',tier:2,unlock:14,value:28,specialties:['corporate','operations'],note:'Influence + statewide prestige'},
 agricultural:{name:'Agricultural Heartland',tier:3,unlock:18,value:22,specialties:['lending','people'],note:'Seasonal credit + relationship loyalty'},
 innovation:{name:'Innovation Hub',tier:3,unlock:22,value:30,specialties:['digital','business'],note:'Technology firms + high-growth treasury'},
 logistics:{name:'Logistics Gateway',tier:3,unlock:26,value:32,specialties:['business','operations'],note:'Trade finance + operating deposits'},
 resort:{name:'Coastal Resort District',tier:3,unlock:30,value:26,specialties:['service','corporate'],note:'Wealth + seasonal deposits'}
};
const STRATEGY_BRANCHES={
 network:{name:'BRANCH NETWORK',promise:'Physical reach, local loyalty, and lower expansion cost.',nodes:[
  {name:'Local Market Playbook',cost:280000,cycles:2,desc:'Branches cost 8% less and generate stronger local pull.'},
  {name:'Hub-and-Spoke Network',cost:480000,cycles:3,desc:'Branch initiatives finish faster and reinforce service capacity.'},
  {name:'Deposit Franchise',cost:760000,cycles:4,desc:'Every branch compounds deposit growth and reputation.'},
  {name:'National Charter',cost:1180000,cycles:5,desc:'Capstone: new branches open with immediate customers and market share.'}
 ]},
 digital:{name:'DIGITAL PLATFORM',promise:'Scalable acquisition, automation, and channel resilience.',nodes:[
  {name:'Mobile Onboarding',cost:320000,cycles:2,desc:'Accelerate digital adoption and household acquisition.'},
  {name:'Automation Engine',cost:540000,cycles:3,desc:'Lower operating expense and improve service capacity.'},
  {name:'Data-Led Growth',cost:820000,cycles:4,desc:'Improve opportunity conversion and digital deposit growth.'},
  {name:'Digital Challenger',cost:1260000,cycles:5,desc:'Capstone: a high-scale national digital deposit franchise.'}
 ]},
 commercial:{name:'COMMERCIAL BANK',promise:'Business relationships, treasury revenue, and disciplined credit scale.',nodes:[
  {name:'Relationship Teams',cost:360000,cycles:2,desc:'Grow business and merchant relationships faster.'},
  {name:'Treasury Platform',cost:620000,cycles:3,desc:'Increase fee income from operating companies.'},
  {name:'Specialized Credit',cost:1010000,cycles:4,desc:'Expand loan production with better underwriting support.'},
  {name:'Corporate Bank',cost:1560000,cycles:5,desc:'Capstone: convert commercial scale into major earnings power.'}
 ]},
 operations:{name:'OPERATIONAL EXCELLENCE',promise:'Delivery capacity, efficiency, controls, and resilience.',nodes:[
  {name:'Process Redesign',cost:290000,cycles:2,desc:'Long operating initiatives finish one cycle sooner.'},
  {name:'Dual Delivery',cost:560000,cycles:3,desc:'Adds 1.5 execution capacity per Operations tier; staffing supports more concurrent work.'},
  {name:'Lean Operations',cost:860000,cycles:4,desc:'Reduce project costs and recurring operating expense.'},
  {name:'Resilient Enterprise',cost:1280000,cycles:5,desc:'Capstone: exceptional risk control and disruption resilience.'}
 ]},
 acquisition:{name:'ACQUISITION STRATEGY',promise:'Deal sourcing, integration skill, and rapid market consolidation.',nodes:[
  {name:'Integration Office',cost:240000,cycles:2,desc:'Lower acquisition cost and integration risk.'},
  {name:'Deal Pipeline',cost:410000,cycles:3,desc:'Competitor book acquisitions close one cycle faster.'},
  {name:'Consolidation Playbook',cost:630000,cycles:4,desc:'Acquisitions deliver more deposits, loans, and customers.'},
  {name:'Serial Acquirer',cost:950000,cycles:5,desc:'Capstone: acquisitions seize substantially more market share.'}
 ]}
};
const STRATEGY_SPECIALIZATIONS={
 network:{retailDensity:{name:'Retail Density',desc:'Full-service branches produce more households, deposits, and reputation.'},regionalHub:{name:'Regional Hubs',desc:'All branch models build faster and reinforce surrounding market capacity.'}},
 digital:{customerExperience:{name:'Customer Experience',desc:'Digital adoption converts directly into households and deposits.'},automation:{name:'Back-Office Automation',desc:'Technology lowers recurring operating expense and project friction.'}},
 commercial:{treasury:{name:'Treasury & Payments',desc:'Merchant services and operating-account fee income compound faster.'},specializedCredit:{name:'Specialized Credit',desc:'Loan production accelerates with a measured increase in underwriting risk.'}},
 operations:{lean:{name:'Lean Delivery',desc:'Staff and facility expense fall while project teams execute more efficiently.'},resilience:{name:'Risk & Resilience',desc:'Controls, defensive actions, and disruption recovery become materially stronger.'}},
 acquisition:{dealmaker:{name:'Dealmaker',desc:'Acquisitions cost less and close with stronger market-share impact.'},integrator:{name:'Integration Discipline',desc:'Acquired customers and assets transfer more cleanly with less attention.'}}
};
const PROJECTS={
 branch:{name:'Full-Service Financial Center',cost:560000,cycles:3,capacity:1.5,desc:'Broad household service, local reputation, and balanced deposit capacity.',target:true,kind:'branch',facility:'retail'},
 branchCommercial:{name:'Commercial Banking Office',cost:560000,cycles:3,capacity:1.5,desc:'Business development, treasury relationships, and merchant capacity.',target:true,kind:'branch',facility:'commercial'},
 branchDigital:{name:'Digital Advisory Studio',cost:470000,cycles:2,capacity:1.25,desc:'Low-cost digital acquisition, advisory service, and household onboarding.',target:true,kind:'branch',facility:'digital'},
 hire:{name:'Legacy Recruit a Banker',cost:190000,cycles:2,capacity:1,desc:'Legacy save compatibility. Hiring is now a direct action.',target:false,legacy:true},
 marketing:{name:'Market-Wide Advertising',cost:260000,cycles:2,capacity:1,desc:'Boost reputation and market influence for four cycles.',target:false},
 technology:{capacity:1.5,name:'Legacy Core Technology Upgrade',cost:440000,cycles:3,desc:'Legacy save compatibility.',target:false,upgrade:'technology',max:3,legacy:true},
 training:{capacity:1.5,name:'Legacy Staff Development Academy',cost:210000,cycles:2,desc:'Legacy save compatibility.',target:false,upgrade:'training',max:3,legacy:true},
 remediation:{name:'Compliance Remediation',cost:170000,cycles:2,capacity:1,desc:'Aggressively reduce risk and Corporate Attention.',target:false},
 capital:{capacity:1.5,name:'Legacy Corporate Capital Request',cost:100000,cycles:2,desc:'Legacy save compatibility.',target:false,legacy:true},
 analytics:{capacity:1.5,name:'Legacy Market Analytics Platform',cost:520000,cycles:3,desc:'Legacy save compatibility.',target:false,upgrade:'analytics',max:3,legacy:true},
 wealthDesk:{capacity:1.5,name:'Legacy Private Wealth Desk',cost:380000,cycles:3,desc:'Legacy save compatibility.',target:false,upgrade:'wealth',max:3,legacy:true},
 operationsCenter:{capacity:1.5,name:'Legacy Regional Operations Center',cost:600000,cycles:4,desc:'Legacy save compatibility.',target:false,upgrade:'operations',max:3,legacy:true},
 acquisition:{name:'Competitor Book Acquisition',cost:1100000,cycles:4,capacity:3,desc:'Acquire customers, deposits, and share in the focus market.',target:true,kind:'acquisition'},
 roadmapNetwork:{legacy:true,capacity:2,name:'Branch Network Strategy',strategy:'network',target:false},
 roadmapDigital:{legacy:true,capacity:2,name:'Digital Platform Strategy',strategy:'digital',target:false},
 roadmapCommercial:{legacy:true,capacity:2,name:'Commercial Bank Strategy',strategy:'commercial',target:false},
 roadmapOperations:{legacy:true,capacity:2,name:'Operational Excellence Strategy',strategy:'operations',target:false},
 roadmapAcquisition:{legacy:true,capacity:2,name:'Acquisition Strategy',strategy:'acquisition',target:false}
};
const OPPORTUNITY_TYPES={
 deposit:{name:'Large Deposit Household',dept:'service',base:900000,desc:'Rate-sensitive deposits and household relationships.'},
 business:{name:'Operating Company Relationship',dept:'business',base:750000,desc:'Operating deposits, treasury, and merchant services.'},
 loan:{name:'Commercial Loan Request',dept:'lending',base:1100000,desc:'Loan production with meaningful revenue and risk.'},
 wealth:{name:'Private Banking Household',dept:'service',base:1250000,desc:'Deposits, wealth referrals, and executive visibility.'},
 payroll:{name:'Employer Payroll Conversion',dept:'business',base:1050000,desc:'Payroll deposits, employees, and merchant activity.'},
 public:{name:'Municipal Banking Bid',dept:'operations',base:1600000,desc:'Public deposits requiring strong controls and influence.'}
};
const EVENTS=[
 {key:'quiet',name:'NORMAL OPERATING MONTH',text:'Corporate has not created an emergency. Yet.',a:'Push production',ad:'More momentum, slightly more risk.',b:'Documentation day',bd:'Reduce risk and improve controls.'},
 {key:'ratewar',name:'MARKET-WIDE RATE WAR',text:'Competitors are repricing deposits aggressively.',a:'Match the market',ad:'Spend cash for faster deposit growth.',b:'Protect margin',bd:'Accept slower growth for stronger profit.'},
 {key:'staffing',name:'UNEXPECTED STAFFING SHORTAGE',text:'Coverage is thin and lobby traffic is climbing.',a:'Authorize overtime',ad:'Protect service at a cash and morale cost.',b:'Operate lean',bd:'Save cash but risk reputation.'},
 {key:'audit',name:'REGULATORY EXAM NOTICE',text:'Controls and documentation are under review.',a:'Full remediation',ad:'Spend cash to reduce risk and heat.',b:'Defend current practices',bd:'Save cash; results depend on Operations staffing.'},
 {key:'community',name:'STATEWIDE COMMUNITY WEEK',text:'Every institution is expected to demonstrate local commitment.',a:'Sponsor events',ad:'Buy reputation and local influence.',b:'Decline politely',bd:'Preserve cash; lose a little visibility.'},
 {key:'outage',name:'CORE SYSTEM OUTAGE',text:'Service capacity depends on technology and preparation.',a:'Emergency vendor support',ad:'Spend cash to contain disruption.',b:'Recover internally',bd:'Technology and Operations determine the damage.'},
 {key:'stretch',name:'NEW CORPORATE STRETCH GOALS',text:'Leadership has discovered a larger number in Excel.',a:'Accept the targets',ad:'Gain influence but pressure morale.',b:'Negotiate',bd:'Protect morale but risk executive attention.'},
 {key:'fraud',name:'SUSPICIOUS TRANSACTION PANIC',text:'A complicated relationship has triggered review.',a:'Freeze and investigate',ad:'Reduce risk but sacrifice production.',b:'Keep processing',bd:'Preserve revenue with compliance exposure.'},
 {key:'downturn',name:'LOCAL RECESSION WARNING',text:'Credit losses may rise across the market.',a:'Tighten credit',ad:'Reduce lending and protect the balance sheet.',b:'Keep lending',bd:'Defend growth with higher risk.'},
 {key:'closure',name:'COMPETITOR BRANCH CLOSURE',text:'Displaced customers are searching for a new institution.',a:'Rapid acquisition campaign',ad:'Spend cash to capture relationships.',b:'Selective outreach',bd:'Smaller but safer opportunity.'},
 {key:'talent',name:'REGIONAL TALENT SCRAMBLE',text:'A competitor is recruiting experienced bankers.',a:'Retention bonuses',ad:'Spend cash and protect morale.',b:'Hold compensation',bd:'Save cash and risk turnover pressure.'},
 {key:'viral',name:'VIRAL CUSTOMER SUCCESS STORY',text:'The institution can amplify a positive local story.',a:'Amplify it',ad:'Spend marketing cash for reputation.',b:'Stay understated',bd:'Gain a smaller, free benefit.'},
 {key:'board',name:'BOARD STRATEGY SESSION',text:'Senior leadership wants a convincing growth narrative.',a:'Present aggressively',ad:'Influence and attention both rise.',b:'Present conservatively',bd:'Smaller influence gain with less risk.'},
 {key:'cyber',name:'CYBERSECURITY DRILL',text:'Technology and controls will determine whether this becomes embarrassing.',a:'Bring in specialists',ad:'Spend cash for protection.',b:'Use internal teams',bd:'Operations and technology carry the burden.'},
 {key:'coffee',name:'THE COFFEE MACHINE HAS FAILED',text:'Employee engagement has entered a critical phase.',a:'Cater emergency coffee',ad:'Small cost, meaningful morale.',b:'Issue a resilience memo',bd:'Free, but almost certainly ineffective.'},
 {key:'manager',name:'SURPRISE REGIONAL MANAGER VISIT',text:'The branch network has one afternoon to look functional.',a:'Polish the presentation',ad:'Spend cash for reputation and influence.',b:'Show authentic operations',bd:'Results depend on morale and controls.'},
 {key:'fintech',name:'FINTECH ENTERS THE MARKET',text:'A well-funded app is targeting younger depositors.',a:'Launch a digital sprint',ad:'Spend cash; technology magnifies the response.',b:'Double down on relationships',bd:'Service and reputation determine retention.'},
 {key:'merger',name:'RIVAL MERGER RUMORS',text:'Customers and employees are anxious about a competitor combination.',a:'Recruit aggressively',ad:'Pursue staff and relationships at a cost.',b:'Stay disciplined',bd:'Protect morale and wait for dislocation.'},
 {key:'losses',name:'CREDIT WATCHLIST EXPANDS',text:'Several borrowers are showing early signs of stress.',a:'Build reserves',ad:'Pay now to contain future credit damage.',b:'Work through cases',bd:'Lending and Operations staffing determine losses.'},
 {key:'housing',name:'HOUSING BOOM',text:'New households and developers are racing into growth markets.',a:'Finance the expansion',ad:'Strong growth with credit exposure.',b:'Prioritize deposits',bd:'Safer household growth and liquidity.'},
 {key:'publicity',name:'EXECUTIVE INTERVIEW REQUEST',text:'A business journal wants your view of the market.',a:'Take the interview',ad:'Influence rises; mistakes attract attention.',b:'Nominate a banker',bd:'Develop staff and protect the executive team.'},
 {key:'storm',name:'REGIONAL WEATHER EMERGENCY',text:'Customers need access, flexibility, and visible leadership.',a:'Open relief centers',ad:'Spend cash for loyalty and reputation.',b:'Go digital-first',bd:'Technology determines service continuity.'},
 {key:'activist',name:'ACTIVIST INVESTOR LETTER',text:'Corporate wants a sharper return on capital plan.',a:'Promise efficiency',ad:'Profit rises temporarily; morale takes pressure.',b:'Defend the franchise',bd:'Influence determines whether patience holds.'},
 {key:'succession',name:'KEY LEADER SUCCESSION',text:'A respected market president announces retirement.',a:'Promote internally',ad:'Training and morale make the transition work.',b:'Hire an outsider',bd:'Spend cash for immediate production capacity.'},
 {key:'vendor',name:'VENDOR CONTRACT RENEWAL',text:'Core operating costs are under negotiation.',a:'Consolidate vendors',ad:'Lower expense with execution risk.',b:'Preserve resilience',bd:'Pay more to protect operations.'},
 {key:'expansion',name:'CORPORATE EXPANSION WINDOW',text:'Capital is temporarily available for a visible growth move.',a:'Request the funds',ad:'Influence converts into cash and attention.',b:'Protect independence',bd:'Build morale and keep heat low.'}
];
const MANDATES={
 map:{name:'MARKET DOMINANCE',desc:'Control a majority of campaign markets.',bonus:120},
 deposits:{name:'DEPOSIT TITAN',desc:'Finish with at least $40M in deposits.',bonus:100},
 commercial:{name:'COMMERCIAL POWERHOUSE',desc:'Finish with 105 business relationships and 80 merchant clients.',bonus:100},
 earnings:{name:'EARNINGS MACHINE',desc:'Generate at least $2.2M in cumulative earnings.',bonus:100},
 clean:{name:'CLEAN BOOKS',desc:'Finish with risk at 18 or less and attention below 30.',bonus:100},
 people:{name:'EMPLOYER OF CHOICE',desc:'Finish with morale 82+, staff 10+, and training level 2+.',bonus:100},
 digital:{name:'DIGITAL FIRST',desc:'Finish with digital adoption 85+ and technology level 2+.',bonus:100},
 network:{name:'PHYSICAL EMPIRE',desc:'Operate a full branch network across the map.',bonus:100}
};
const MILESTONES={firstMarket:{name:'Market Leader',desc:'Control your first market.'},scale:{name:'Balance-Sheet Scale',desc:'Reach $50M in combined deposits and loans.'},rainmaker:{name:'Rainmaker',desc:'Win 8 live opportunities.'},builder:{name:'Franchise Builder',desc:'Operate 8 branch levels.'},trusted:{name:'Trusted Institution',desc:'Reach 82 reputation with risk below 30.'},digital:{name:'Digital Transformation',desc:'Reach 80 digital adoption and technology level 2.'}};
