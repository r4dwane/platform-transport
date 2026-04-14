export const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString("fr-DZ", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};
 
export const formatDateTime = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString("fr-DZ", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};
 
export const timeAgo = (dateStr: string): string => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days  = Math.floor(hours / 24);
 
  if (mins < 1)   return "À l'instant";
  if (mins < 60)  return `Il y a ${mins} min`;
  if (hours < 24) return `Il y a ${hours}h`;
  return `Il y a ${days}j`;
};