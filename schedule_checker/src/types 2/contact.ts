export interface Contact {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  memo?: string;
  ownerId: string;
  createdAt: { seconds: number; nanoseconds: number };
}

export interface ContactInput {
  name: string;
  email?: string;
  phone?: string;
  memo?: string;
}
