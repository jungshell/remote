export interface Alert {
  id: string;
  title: string;
  body?: string;
  at?: string;
  done: boolean;
  ownerId: string;
  createdAt: { seconds: number; nanoseconds: number };
}

export interface AlertInput {
  title: string;
  body?: string;
  at?: string;
}
