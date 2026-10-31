import React from 'react';
import {
  LayoutDashboard,
  Flame,
  Droplets,
  IndianRupee,
  CalendarCheck2,
  Smartphone,
  FileSpreadsheet,
  BotMessageSquare,
  Sliders,
  Settings,
  Boxes,
  Layers,
  Heart,
  Dumbbell,
  Book,
  Wallet,
  Sparkles,
  Trophy,
  Coffee,
  CheckCircle2,
  Star,
  Activity,
  LucideIcon,
} from 'lucide-react';

export const ICON_MAP: Record<string, LucideIcon> = {
  LayoutDashboard,
  Flame,
  Droplets,
  IndianRupee,
  CalendarCheck2,
  Smartphone,
  FileSpreadsheet,
  BotMessageSquare,
  Sliders,
  Settings,
  Boxes,
  Layers,
  Heart,
  Dumbbell,
  Book,
  Wallet,
  Sparkles,
  Trophy,
  Coffee,
  CheckCircle2,
  Star,
  Activity,
};

export const AVAILABLE_ICONS = Object.keys(ICON_MAP);

export const getIconComponent = (iconName: string): LucideIcon => {
  return ICON_MAP[iconName] || Boxes;
};
