import { Bill, Member, Transaction, SettlementSummary } from '../types';

export const calculateSettlements = (bills: Bill[], members: Member[]): { summary: SettlementSummary[], transactions: Transaction[] } => {
  const balances: Record<string, number> = {};

  // Initialize 0 balance
  members.forEach(m => balances[m.id] = 0);

  // Calculate net balance for each person
  bills.forEach(bill => {
    if (bill.involvedIds.length === 0) return;
    
    // Payer gets credit (positive)
    balances[bill.payerId] = (balances[bill.payerId] || 0) + bill.amount;

    // Involved people get debt (negative)
    const splitAmount = bill.amount / bill.involvedIds.length;
    bill.involvedIds.forEach(involvedId => {
      balances[involvedId] = (balances[involvedId] || 0) - splitAmount;
    });
  });

  // Create summary array
  const summary: SettlementSummary[] = Object.entries(balances).map(([memberId, balance]) => ({
    memberId,
    balance
  }));

  // Calculate transactions (Greedy algorithm)
  const debtors = summary.filter(s => s.balance < -0.01).sort((a, b) => a.balance - b.balance); // Ascending (most negative first)
  const creditors = summary.filter(s => s.balance > 0.01).sort((a, b) => b.balance - a.balance); // Descending (most positive first)

  const transactions: Transaction[] = [];

  let i = 0; // debtor index
  let j = 0; // creditor index

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];

    // The amount to settle is the minimum of what the debtor owes and what the creditor is owed
    const amount = Math.min(Math.abs(debtor.balance), creditor.balance);

    // Record transaction
    transactions.push({
      fromId: debtor.memberId,
      toId: creditor.memberId,
      amount: Number(amount.toFixed(2))
    });

    // Adjust balances
    debtor.balance += amount;
    creditor.balance -= amount;

    // Move indices if settled
    if (Math.abs(debtor.balance) < 0.01) i++;
    if (creditor.balance < 0.01) j++;
  }

  return { summary, transactions };
};

export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('zh-TW', { style: 'currency', currency: 'TWD', maximumFractionDigits: 0 }).format(amount);
};