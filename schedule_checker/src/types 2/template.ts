export interface Template {
  id: string;
  name: string;
  body: string;
  ownerId: string;
  createdAt: { seconds: number; nanoseconds: number };
}

export interface TemplateInput {
  name: string;
  body: string;
}
