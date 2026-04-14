export type UserRole = "admin";

export type Employee = {
  id: number;
  name: string;
  phone: string;
  contract_end: string;
  promotion_due: string;
  notes: string;
};

export type BudgetItem = {
  id: number;
  type: "income" | "expense";
  category: string;
  title: string;
  amount: number;
  meeting_date: string;
  notes: string;
};
