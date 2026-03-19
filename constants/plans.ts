export type Plan = {
  id: 'free' | 'plus-monthly' | 'plus-annual' | 'institution';
  name: string;
  amountInr: number;
  billing: 'one-time' | 'monthly' | 'annual';
  features: string;
};

export const PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Free Forever',
    amountInr: 0,
    billing: 'one-time',
    features: 'Bot 1 + Bot 5 only, 20 chats/day, 1 Saathi, 1 Check-in/month',
  },
  {
    id: 'plus-monthly',
    name: 'Saathi Plus (Monthly)',
    amountInr: 199,
    billing: 'monthly',
    features: 'All 5 bots, all Saathis, unlimited Check-ins, notes export',
  },
  {
    id: 'plus-annual',
    name: 'Saathi Plus (Annual)',
    amountInr: 1499,
    billing: 'annual',
    features: 'Everything in Plus, 37% saving',
  },
  {
    id: 'institution',
    name: 'Institution',
    amountInr: 4999,
    billing: 'monthly',
    features: 'Intern marketplace, listings, student browse, Saathi Spotlight',
  },
];
