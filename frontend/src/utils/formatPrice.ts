export const formatPrice = (amount: number): string => {
  return new Intl.NumberFormat("fr-DZ").format(amount) + " DA";
};