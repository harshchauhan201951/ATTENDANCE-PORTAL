type FeeAmountsInput = {
  amount?: number | null;
  dues_amount?: number | null;
  status?: string | null;
};

export function getFeeAmounts(fee: FeeAmountsInput) {
  const amount = Number(fee.amount || 0);
  const dues = Number(
    fee.dues_amount ?? (String(fee.status || "").toUpperCase() === "PENDING" ? amount : 0)
  );

  return {
    amount,
    paid: Math.max(0, amount - dues),
    dues,
  };
}
