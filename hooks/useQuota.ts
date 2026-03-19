export function useQuota() {
  return {
    remaining: 20,
    coolingUntil: null as Date | null,
  };
}
