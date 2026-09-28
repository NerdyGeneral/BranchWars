# Research tree (Expanded 9.41)

New Expanded campaigns replace the five capability tracks with a research tree.
Campaigns from 9.40 and earlier, and Core, keep their research rules.

## Shape

Six families of six nodes each:

- **Foundation:** no prerequisite.
- **Path A and Path B:** two nodes each. The second node needs the first.
- **Capstone:** needs the second node of either path.

| Family | Path A | Path B |
| --- | --- | --- |
| Network & Markets | Local service | Office network |
| Digital Systems | Customer channels | Automation & analytics |
| Commercial Banking | Treasury & payments | Commercial credit & pricing |
| Operations & Delivery | Delivery capacity | Controls & programmes |
| Acquisitions & Integration | Deal terms | Integration |
| Risk & Capital | Credit risk | Supervision & capital |

## Funding

| Node | Cost |
| --- | --- |
| Foundation | $100K |
| First path node | $140K |
| Second path node | $180K |
| Capstone | $260K |

- Each node absorbs at most $100K a month, and each family funds one node at a time. Different families fund in parallel.
- Funding is paid when the month resolves. A node applies from the month after it is fully paid.

## Effects

- **Family level:** the number of nodes learned, up to 3. The capstone makes it 4. Levels drive the long-standing capability effects, so existing consumers are unchanged.
- **Node effects:** each node adds one named effect of its own. The five 9.37 Digital & Commercial projects keep their effects as nodes in the Digital Systems and Commercial Banking families.
- **Combined research:** five combinations turn on by themselves when both of their nodes are learned.
- **Operating models:** each family has three permanent models, available once its foundation is learned.
- **Risk & Capital:** carries loss control. Operations research no longer lowers new-loan risk.

### Stacking

Effects on the same term multiply; per-month drifts (compliance, attention, execution capacity) add.

The discounts that used to be either/or now combine:
- Operations level 3 and the Lean model.
- Network level 2 and Regional Hubs.

Strategy → Research → Stacked effects lists every active source.

## Interface

Strategy → Research lists the six families, Combined research and Stacked effects. A family page draws its tree beside the selected node's cost, prerequisites, effect and funding, so choosing a node stays on the page. Operating models are in Strategy → Operating models.

## AI

The AI funds foundations first, then continues along a path to the capstone. It keeps its existing capital buffer, so it researches when it has spare cash.

## Compatibility

- `researchTreeVersion: 1` stamps 9.41 and requires 9.40 bank cards and 9.37 digital & commercial research. Peers without the capability are refused before a 9.41 campaign links.
- The owner's view carries only its own research book and pending funding.
- The recurring research mandate covers the five original families. Fund Risk & Capital from Research.

## Tests

- `tests/research_tree.test.js`: the boundary, funding rules, levels, every advertised effect against its consumer, stacking, Risk & Capital and models, persistence and the AI.
- `tests/interface_people_strategy.test.js`: the Research page.
