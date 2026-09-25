# Approved master objective: Integrated Expanded Edition

This is a preserved copy of the user-approved goal, originally supplied in attachment `0a3c2ffc-6a58-4d76-81ed-a593d5300aea/goal-objective.md`. It defines scope and finish criteria, not current completion. Use the [implementation ledger](v3-usability.md) for status. Copied during the September13 documentation cleanup; no requirements or permissions were changed. Escaped Markdown in the original is retained.

---

Master Goal: Branch Wars V3 — Complete the Integrated Expanded Edition
Primary objective
Complete a coherent, understandable and thoroughly tested Branch Wars V3 Expanded Edition: a long-term banking management and competitive strategy game whose systems meaningfully interact.
Continue from the current implementation. Finish and repair existing work before creating replacement systems. Deliver a playable, exportable local release candidate with updated documentation and evidence-based debug, balance, performance and multiplayer reports.
Prioritize completed, useful work. Do not turn this project into an endless architecture rewrite, design exercise or polishing loop.
Primary working location:
C:\Users\xande\Downloads\Branch\_Wars\_Executive\_Command\_v6\_No\_Server\BranchWars-v3-usability\game
Verify the actual repository, branch, working tree and current documentation before changing anything. Preserve existing contributor work.
1\. Product direction and scope
\- Consolidate new-game complexity into the agreed Core and integrated Expanded experience, rather than requiring players to assemble fragile combinations of interdependent preview features.
\- Preserve supported existing campaigns, including historical modular configurations. Simplifying setup does not authorize deleting legacy rules or silently upgrading saves.
\- Keep the implementation internally modular even though Expanded is presented as one connected experience.
\- Preserve open-ended banking rivalry. Diversification is optional strategic development—not a requirement that every successful bank become the same conglomerate.
\- Preserve portable/offline play and supported solo, hotseat, LAN, direct-link and GitHub-room modes.
\- Keep campaign edition and rules fixed after starting. Operating strategies may change through explicit in-game decisions, contracts and implementation projects.
\- Preserve approved content. Consolidation means connecting systems and eliminating duplication—not removing depth.
\- Keep National Empire content, insurance underwriting and unrelated expansions outside this release.
\- Produce the local V3 release package. Do not push, publish, merge, delete remote branches or modify GitHub releases without separate explicit authorization.
Treat the actual implementation and verified tests as evidence. Do not assume a feature is complete merely because documentation or an earlier response says it is.
2\. Delivery discipline: prevent development loops
These rules govern every workstream:
1\. Work toward explicit acceptance criteria. Once a feature meets its requirements and passes proportionate verification, move forward. Reopen it only for a concrete defect, failed requirement or demonstrated integration problem.
2\. Every batch must deliver a usable outcome. Architecture work must support a repair, feature, testability improvement or concrete maintenance problem.
3\. Prefer the smallest coherent implementation that fulfills the approved requirement. Avoid speculative frameworks and abstractions for hypothetical future systems.
4\. Do not repeatedly redesign approved systems. Improve working systems incrementally unless evidence demonstrates that their design prevents completion.
5\. Limit repeated failed approaches. After two unsuccessful attempts using substantially the same approach, reassess the cause and change the approach. If genuinely blocked, record the evidence and continue independent work.
6\. Separate blockers from polish. Data loss, resource duplication, broken accounting, multiplayer corruption, privacy leaks and unusable core workflows block release. Minor cosmetics, optional optimization and speculative improvements belong in a follow-up backlog.
7\. Timebox investigation and polishing—not approved content. Do not silently omit requirements or replace functioning mechanics with placeholders to claim completion.
8\. Test proportionately. Use targeted checks during implementation, broader checks at integration gates and the full required suite on the final candidate. Do not repeatedly test identical unchanged builds without a reason.
9\. Freeze scope during release stabilization. Fix defects rather than introducing new features or redesigning completed layouts.
10\. Report outcomes, not just activity. Explain what now works, what remains and what is actually blocked.
Never weaken tests, regenerate expected results to conceal defects, or mislabel unfinished work to escape a deadline.
Operating principle: complete → verify → move forward.
3\. Finish the five core repair areas
A. Campaign integrity and recovery
Repair and verify creation, Continue, saving, loading, import/export, exit/re-entry, rematch, reconnect and checkpoint restoration.
Ensure:
\- Campaign identity, versions, selections and player ownership remain correct.
\- Draft plans, committed plans and resolved results remain distinguishable.
\- Recovery cannot duplicate money, employees, customers, projects or settlements.
\- Invalid or unsupported states fail safely with useful explanations.
\- Imports and network messages do not silently invent resources, repair inconsistent selections or change campaign rules.
B. Advertising with real, explainable effects
Trace and repair advertising through the appropriate stages:
Budget → audience reached → interest/applications → processing → activation → funded relationships → retained earnings.
Different campaigns may use different paths, but every implemented path needs an explainable effect.
Verify:
\- Spending is charged exactly once.
\- Segments, channels, offers, duration and market conditions matter.
\- Pausing, ending and changing campaigns behave as described.
\- Finite customer pools and staff capacity constrain results.
\- Advertising does not generate unsupported deposits or duplicate relationships.
\- The UI separates activity, pending conversions and realized outcomes.
\- Controlled advertising-versus-no-advertising tests demonstrate actual costs and benefits.
C. One finite, truthful workforce
Unify staffing calculations across departments, facilities, pursuits, onboarding, servicing, projects, subsidiaries and forecasts.
Clearly show:
\- Employees, professional roles and qualifications.
\- Assigned work, reserved commitments and remaining capacity.
\- Payroll, purchased services and shared-service charges.
\- Bottlenecks and the actions that relieve them.
Do not count an employee as fully available in several places. Do not make ordinary Business bankers interchangeable with investment advisers, insurance producers or specialist operations staff.
Shared staff and visiting specialists are allowed, but time, qualifications and cost allocation must be explicit.
D. Sustainable long-campaign gameplay
Repair unintended economic failure loops, misleading profitability, runaway resource generation and dominant strategies caused by defects.
Successful banks may dominate. Do not force equal outcomes or create arbitrary comeback money.
Verify that plausible human and AI strategies can operate, adapt and compete over long campaigns, with understandable consequences for risk-taking, overexpansion and poor management.
E. Actionable bottlenecks and warnings
Every important warning should explain:
\- What is wrong.
\- What causes it.
\- What consequences follow.
\- Which controls can address it.
Warnings should open the relevant object and action. Do not merely hide warnings or relabel broken mechanics.
4\. Corporate structure, permissions and group accounting
Implement a manageable, simplified U.S.-inspired institutional structure supporting banking, insurance agency, brokerage, investment advice and custody.
Distinguish:
\- Legal entity: ownership, employment, resources and obligations.
\- Business line: the services being provided.
\- Authorization: permitted activities and required qualifications.
\- Operating model: owned delivery, partnership, outsourcing or supported hybrid.
\- Facility: the physical or digital location delivering services.
Verify material legal assumptions against current primary regulatory sources. Document intentional fictional allowances. Do not present game rules as comprehensive legal compliance.
An LLC or corporation is not itself a financial-services license. Do not require financial-holding-company status indiscriminately for every nonbank activity.
Provide a coherent ownership model for new groups while preserving existing campaigns through explicit version and compatibility boundaries.
Accounting requirements
\- Separate bank liquidity, parent cash, subsidiary operating funds and client assets.
\- Record capital contributions, dividends, service charges, loans and other transfers as identifiable transactions.
\- Eliminate internal transfers and internal revenue/expense pairs appropriately in consolidated reporting.
\- Do not count parent investments and subsidiary net assets twice.
\- Do not treat assets under advice or custody as spendable institutional money.
\- Represent actual bank deposits and corresponding obligations correctly.
\- Give subsidiaries real staffing, capacity, expenses and financial viability.
\- Preserve separately funded subsidiaries with optional capped parent support.
\- Treat previously approved support safeguards as provisional balance values—not exact statutory limits.
Operating permissions should require continued organizational and financial readiness. They must not become permanent bonuses unlocked by a single research purchase.
5\. Meaningful choice in advice, brokerage, custody and clearing
Do not force every group into an introducing-broker model.
Support distinct operating configurations, including:
\- Introducing brokerage using an outside carrying provider.
\- Investment advisory business using an external custodian.
\- Group-owned custody through an appropriately authorized bank operation or carrying brokerage business.
Keep advice, custody/account carrying, execution and clearing distinguishable. Owning custody must not automatically require bringing every clearing or execution function in-house.
Each supported configuration should differ in:
\- Startup funding and implementation time.
\- Staffing, qualifications and controls.
\- Technology and operating capacity.
\- Provider fees and retained revenue.
\- Customer service and available products.
\- Operational risk and maintenance obligations.
External delivery must remain viable over a long campaign—not merely an inferior first tier.
Provider or operating-model changes require explicit migration projects with costs, capacity requirements, account continuity and possible disruption. Do not instantaneously duplicate or convert entire customer books.
Cash management and cross-selling
Support appropriate choices for eligible uninvested investment-account cash:
\- Affiliated-bank sweeps.
\- External-bank arrangements.
\- Money-market fund options.
Distinguish those balances from invested securities and institutional operating cash.
Track actual sources and destinations:
\- Existing bank deposits moved into investments.
\- Investments won from an outside provider.
\- Uninvested cash deposited into a bank.
\- Assets transferred between custodians without creating deposits.
Customer choice, suitability, pricing and retention should influence outcomes. Cross-selling must not automatically give every customer every product.
6\. Adaptable facilities and office extensions
A separate business must not require a separate building.
Preserve and deepen appropriate micro/ATM, retail, commercial, digital/advisory, wealth, financial-center and regional-hub functions.
Allow existing locations to gain extensions such as:
\- Visiting-adviser desks.
\- Permanently staffed wealth suites.
\- Insurance agency offices.
\- Commercial banking suites.
\- Shared advisory wings.
\- Additional premises accommodating several services.
Keep service extensions distinct from conversions and new construction.
Each should involve meaningful space, staffing, cost, capacity, condition and maintenance requirements.
Buildings may host several entities. Identify which business provides each service, and reconcile occupancy and shared-service costs without artificial group profit.
Support networks that evolve through expansion, renovation, conversion, consolidation and approved closures. Avoid a universal progression where every location eventually becomes the same financial center.
7\. Complete the connected management systems
Audit the approved roadmap against the actual implementation. Finish missing behavior within scope rather than adding disconnected controls.
Commercial banking and customer relationships
Connect business development to credible customer needs:
Development → qualified relationship → suitable products → approval/funding → activation/service → retention and earnings.
Separate acquisition, credit approval, funding and servicing.
Not every business needs every product. Business bankers should not automatically create loans. However, business relationships must have meaningful pathways into deposits, lending, merchant and treasury services—not merely abstract counters or unexplained fees.
Maintain distinct ownership, customer identity and product relationships. Avoid duplicating customers when they use multiple group businesses.
Products and credit portfolios
Complete the approved product scope and interactions:
\- Deposit pricing, terms, stability and funding cost.
\- Consumer, mortgage, small-business, commercial and CRE lending where approved.
\- Treasury, merchant and related services.
\- Persistent loan vintages, amortization, arrears, deterioration, losses and servicing.
\- Underwriting, collateral where applicable, concentration, capital and liquidity constraints.
Aggressive growth may outperform, but its future risks must actually occur in the simulation.
Departments and leadership
Develop persistent budgets, staffing, objectives, specialists and leadership within the approved scope.
Delegation should reduce repetitive work as the institution grows. Managers must stay within player-defined limits and must not independently submit turns or make major borrowing, closure or acquisition decisions.
Research and delivery
Use Research → Decision → Implementation → Adoption → Maintenance where appropriate.
Research should unlock implementation choices. Build, buy, outsource and partner approaches should have different costs, timing, control and risks.
Repair empty or misleading research displays. Show prerequisites, alternatives, implementation state and observed effects.
Insurance and wealth businesses
Implement real products, customers, staffing, service capacity, expenses and retention.
Insurance agency operations use third-party carriers and commission economics. Insurance underwriting remains deferred.
Company investments and acquisitions
Preserve approved share markets and deliberate takeover mechanics.
Keep ownership, operating-company finances and banking relationships distinct. Audit relevant structural restrictions and document fictional allowances rather than silently removing mechanics or claiming unrestricted corporate control is realistic banking law.
8\. Player-centered UI overhaul
Reconsider layouts where necessary while retaining useful subject grouping.
Put actions where their objects already are.
\- Market: conditions, construction, expansion, advertising and local projects.
\- Facility: staffing, service extensions, renovation, expansion and conversion.
\- Opportunity: requirements and commitment of available resources.
\- Product: terms, deployment, demand, risk and servicing.
\- Department: people, budgets, objectives and delegation.
\- Subsidiary: funding, operating model, personnel and performance.
\- Warning: the specific control that can resolve it.
Required usability improvements
\- Replace long scrolling with useful summaries, contextual panels and progressive disclosure.
\- Reduce excessive header/navigation space.
\- Make workforce management understandable before layering on more controls.
\- Distinguish current conditions, pending edits, staged commitments, standing policies and resolved results.
\- Show immediate costs and recurring consequences before commitment.
\- Present cash, capital, staff, capacity and lead-time requirements together.
\- Preserve relevant selections, filters and scroll position.
\- Provide keyboard accessibility, sensible focus, reliable cancellation and appropriate confirmations.
\- Keep terminology, bank colors and entity identification consistent.
\- Preserve owner-private information.
Forecasts must disclose assumptions and uncertainty. Do not promise results that depend on hidden rival actions or future events.
Use charts where they explain funding, earnings, credit quality, conversion or capacity. Avoid decorative metrics without a gameplay purpose.
Keep the game modern and banking-focused. Preserve the manual’s established period-inspired style separately.
9\. Required architecture cleanup
Improve architecture alongside delivery—not as an indefinite prerequisite to delivery.
Central rules and compatibility
\- Centralize edition, version, prerequisite and compatibility logic.
\- Preserve authoritative saved scalar fields, missing-versus-zero semantics and multi-version values.
\- Do not create a competing saved feature map.
\- Keep compatibility handling out of unrelated UI components.
\- Reject inconsistent saved or received states without silent repair.
Shared planning calculations
Create or consolidate one pure prepared-plan calculation for staffing, commitments, budgets, capacity and forecasts.
All relevant screens must use the same calculations and correctly prepared state. Invalidate derived values when plans, campaigns, months, ownership or connection context change.
Shared action handling
Route contextual controls through authoritative validation and staging.
Different UI entry points must not implement different financial rules for the same action. Rendering and forecasting must not mutate campaign state.
Clear responsibilities
Separate:
\- Content definitions.
\- Rules and compatibility.
\- Simulation domains.
\- Planning and validation.
\- Ordered turn settlement.
\- Accounting and reconciliation.
\- Public/private projections.
\- Persistence.
\- Transport-specific networking.
\- UI rendering and interaction.
Make cross-system dependencies explicit. Replace fragile overrides and duplicated formulas incrementally while preserving settlement order and determinism.
Refactor safeguards
\- Preserve portable distribution and verified build processes.
\- Avoid framework rewrites and broad renaming without concrete benefits.
\- Separate behavior-preserving cleanup from intentional new-version gameplay changes.
\- Preserve legacy fixtures and compatibility expectations.
\- Never regenerate goldens merely to hide drift.
\- Add separate fixtures for intentional, versioned changes.
\- Consolidate overlapping documentation and provide an index without discarding useful historical evidence.
10\. Debug and multiplayer verification
Test the exact source and package being delivered.
Required coverage:
\- Build, syntax, architecture and packaging.
\- Campaign lifecycle and supported legacy versions.
\- Deterministic replay, RNG and settlement order.
\- Pure previews and forecasts.
\- Accounting conservation and resource ownership.
\- Staffing across simultaneous commitments.
\- Advertising and commercial conversion.
\- Product, facility, department and subsidiary interactions.
\- Custody/provider migrations and customer-asset reconciliation.
\- Entity transfers and consolidated reporting.
\- UI actions, confirmations, cancellation and disabled states.
Multiplayer reinforcement
Cover supported transports and verify:
\- Host/guest authority.
\- Lobby settings, identities, colors and readiness.
\- Rule/version compatibility.
\- Reconnection and current-session identification.
\- Delayed, duplicate, stale, malformed and out-of-order messages.
\- Exactly-once resolution and conflict recovery.
\- Checkpoint restoration and interrupted writes.
\- Credential handling and owner-private information.
Distinguish simulated two-client testing from actual two-computer testing. Do not guarantee that multiplayer is bug-free.
11\. Balance, gameplay and performance checks
Establish a bounded, justified test matrix covering:
\- Fixed-seed controls.
\- Different staffing and strategic identities.
\- Advertising versus no advertising.
\- Partner delivery versus owned operations.
\- Office extensions versus dedicated locations.
\- Conservative, balanced and aggressive banking.
\- Representative campaigns of at least 120 months.
\- Selected 480-month Expanded stress campaigns.
Use ordinary AI and plausible human-style plans—not only optimized test policies.
Record profitability, liquidity, capital, concentration, growth, retention, credit losses, subsidiary viability, competitive outcomes and performance.
Report early campaign failures rather than excluding them. Determine whether they result from strategy, intended risk or defects.
Walk through early and mature campaigns in a real browser at practical laptop and larger-screen sizes. Measure meaningful improvements to navigation and responsiveness.
Passing automated checks does not establish enjoyable gameplay or universal correctness.
12\. Execution sequence and progress management
Use gated batches:
1\. Preserve the baseline and establish a requirement/coverage inventory.
2\. Repair shared calculations and lifecycle defects.
3\. Complete institutional, workforce and facility foundations.
4\. Complete connected gameplay and contextual workflows.
5\. Integrate and perform balance/performance checks.
6\. Freeze features, resolve release blockers, update documentation and package.
Adjust ordering for actual dependencies, but continue through independent work without stopping after every subsystem.
Maintain one authoritative status record:
\- Implemented and verified.
\- Implemented but awaiting verification.
\- Remaining in scope.
\- Deferred by agreement.
\- Blocked with evidence.
\- Decisions requiring user review.
\- Provisional assumptions and significant balance changes.
Proceed autonomously on engineering, UI and reversible numerical decisions.
Ask only when necessary for a material scope expansion, removal of approved content, fundamental identity change, destructive action or external publication.
When blocked, explain the exact missing dependency or decision. Continue independent work rather than repeatedly revisiting the blocker.
13\. Deliverables and finish line
Deliver:
\- Updated source.
\- A clearly named, exportable local V3 package.
\- Updated blueprint, architecture documentation and release status.
\- Updated in-game help and comprehensive V3 manual.
\- A rendered and visually checked manual PDF.
\- A concise player-facing change summary.
\- Exact-build debug, balance, performance, compatibility and multiplayer reports.
\- Known issues, provisional assumptions and a short human-playtest checklist.
Definition of implementation complete
\- The five core repair areas are resolved.
\- Approved in-scope systems have functional, explainable interactions.
\- Corporate entities, operating models and physical facilities are correctly distinguished.
\- Common tasks do not require unnecessary tab-hopping or contradictory calculations.
\- Relevant architecture duplication is repaired without breaking supported compatibility.
\- No known unresolved critical or high-severity defects remain in scope.
\- The final package passes its required release checks.
\- Remaining minor improvements are documented rather than endlessly polished.
If real two-computer multiplayer or subjective gameplay acceptance remains outstanding, label the result:
Implementation-complete release candidate — pending human acceptance.
If a genuine implementation blocker remains, deliver completed work and identify it explicitly. Do not call the full implementation complete.
Finish this defined release before expanding the roadmap again. Deliver working depth, verify it, and move forward.
