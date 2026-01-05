export interface Member {
  id: string;
  name: string;
}

export interface Bill {
  id: string;
  title: string;
  amount: number;
  payerId: string;
  involvedIds: string[];
  createdAt: number;
}

export interface Transaction {
  fromId: string;
  toId: string;
  amount: number;
}

export interface SettlementSummary {
  memberId: string;
  balance: number; // Positive = receives money, Negative = owes money
}

export enum ViewState {
  MEMBERS = 'MEMBERS',
  BILLS = 'BILLS',
  SETTLEMENT = 'SETTLEMENT'
}