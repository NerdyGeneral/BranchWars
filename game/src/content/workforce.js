// Workforce v1. Specialist headcount is part of (never additional to) bank staff.
const SPECIALIST_ROLES = {
  service: { name: 'Retail advisers', premium: 30000, payroll: 4000, effect: 'Retail acquisition and service coverage; stronger goodwill when workload is covered.' },
  business: { name: 'Relationship bankers', premium: 45000, payroll: 5000, effect: 'Commercial sales or signed-service delivery, divided between the two assignments.' },
  lending: { name: 'Credit analysts', premium: 50000, payroll: 6000, effect: 'Loan origination capacity. More production also requires funding and capital.' },
  operations: { name: 'Risk specialists', premium: 60000, payroll: 6500, effect: 'Project execution and credit-loss controls; not sales in every department.' }
};
const WORKFORCE_TRAINING_BUDGETS = [0, 2000, 5000, 10000, 20000, 40000, 80000];
const SPECIALIST_ENTRY_SKILL = 20, SPECIALIST_TRAINING_COST = 1000, SPECIALIST_MAX_GAIN = 4;
