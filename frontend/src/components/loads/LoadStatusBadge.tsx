import { Badge } from "@/components/ui/Badge";
import { StatutCharge } from "@/types/load.types";
import { getLoadStatusColor, getLoadStatusLabel } from "@/utils/getStatusColor";
 
export const LoadStatusBadge = ({ status }: { status: StatutCharge }) => (
  <Badge label={getLoadStatusLabel(status)} color={getLoadStatusColor(status)} />
);