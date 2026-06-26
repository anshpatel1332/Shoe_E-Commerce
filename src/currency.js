const rupeeFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

const INR_DISPLAY_MULTIPLIER = 10;

export const money = (value) => rupeeFormatter.format(Number(value || 0) * INR_DISPLAY_MULTIPLIER);
