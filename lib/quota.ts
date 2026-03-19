export async function checkQuota(userId: string, saathiId: string, botSlot: number) {
  void userId;
  void saathiId;
  void botSlot;

  return {
    allowed: true,
    remaining: 20,
    coolingUntil: null as Date | null,
  };
}

export async function decrementQuota(userId: string, saathiId: string, botSlot: number) {
  void userId;
  void saathiId;
  void botSlot;
}
