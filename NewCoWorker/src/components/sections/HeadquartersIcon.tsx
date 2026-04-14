import type { Headquarters } from "@/content/types";
import {
  Cpu,
  Landmark,
  LineChart,
  Sparkles,
  Users,
  type LucideIcon,
} from "lucide-react";

const MAP: Record<Headquarters["lucideIcon"], LucideIcon> = {
  Sparkles,
  Cpu,
  Users,
  Landmark,
  LineChart,
};

export function HeadquartersIcon({
  name,
  className,
}: {
  name: Headquarters["lucideIcon"];
  className?: string;
}) {
  const Icon = MAP[name];
  return <Icon className={className} aria-hidden />;
}
