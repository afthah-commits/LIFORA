import React from 'react';
import { Link } from 'react-router-dom';
import {
  Flame,
  Smartphone,
  IndianRupee,
  CalendarCheck2,
  Droplets,
  Layers,
  ArrowRight,
  Boxes,
  LucideIcon,
} from 'lucide-react';
import { Badge } from '../common/Badge';

export interface DynamicCardStat {
  label: string;
  value: string | number;
  subtext?: string;
  progress?: number | null;
}

export interface DynamicCardProps {
  id: string;
  title: string;
  subtitle?: string;
  icon?: string;
  color?: 'emerald' | 'cyan' | 'purple' | 'blue' | 'amber' | 'rose' | 'zinc';
  badge?: string;
  link: string;
  stats: DynamicCardStat[];
  className?: string;
}

const iconMap: Record<string, LucideIcon> = {
  Flame,
  Smartphone,
  IndianRupee,
  CalendarCheck2,
  Droplets,
  Layers,
  Boxes,
};

const colorStyles: Record<string, { iconBg: string; text: string; bar: string }> = {
  emerald: {
    iconBg: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
    text: 'text-emerald-400',
    bar: 'bg-emerald-500',
  },
  cyan: {
    iconBg: 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400',
    text: 'text-cyan-400',
    bar: 'bg-cyan-500',
  },
  purple: {
    iconBg: 'bg-purple-500/10 border-purple-500/20 text-purple-400',
    text: 'text-purple-400',
    bar: 'bg-purple-500',
  },
  blue: {
    iconBg: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
    text: 'text-blue-400',
    bar: 'bg-blue-500',
  },
  amber: {
    iconBg: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
    text: 'text-amber-400',
    bar: 'bg-amber-500',
  },
  rose: {
    iconBg: 'bg-rose-500/10 border-rose-500/20 text-rose-400',
    text: 'text-rose-400',
    bar: 'bg-rose-500',
  },
  zinc: {
    iconBg: 'bg-zinc-800 border-zinc-700 text-zinc-300',
    text: 'text-zinc-300',
    bar: 'bg-zinc-500',
  },
};

export const DynamicCard: React.FC<DynamicCardProps> = ({
  title,
  subtitle,
  icon = 'Layers',
  color = 'emerald',
  badge,
  link,
  stats,
  className = '',
}) => {
  const IconComponent = iconMap[icon] || Layers;
  const theme = colorStyles[color] || colorStyles.emerald;

  return (
    <Link
      to={link}
      className={`group relative block p-3.5 sm:p-5 rounded-2xl bg-[#121215] border border-zinc-800 hover:border-zinc-700 hover:bg-[#15151a] transition-all duration-200 shadow-lg shadow-black/20 ${className}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-3 mb-3 sm:mb-4">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div
            className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center border shrink-0 ${theme.iconBg}`}
          >
            <IconComponent className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-xs sm:text-base font-bold text-zinc-100 group-hover:text-emerald-400 transition-colors truncate">
              {title}
            </h3>
            {subtitle && <p className="hidden sm:block text-[11px] text-zinc-500 truncate">{subtitle}</p>}
          </div>
        </div>
        {badge && (
          <Badge
            variant={color === 'cyan' ? 'cyan' : color === 'purple' ? 'purple' : 'emerald'}
            size="sm"
            className="text-[10px] sm:text-xs self-start sm:self-auto shrink-0"
          >
            {badge}
          </Badge>
        )}
      </div>

      {/* Card Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 pt-2 border-t border-zinc-800/80">
        {stats.map((stat, idx) => (
          <div key={idx} className="space-y-0.5 sm:space-y-1">
            <span className="text-[10px] sm:text-[11px] font-medium text-zinc-400 block truncate">
              {stat.label}
            </span>
            <span className="text-sm sm:text-xl font-bold text-zinc-100 block truncate">
              {stat.value}
            </span>
            {stat.progress !== null && stat.progress !== undefined && (
              <div className="w-full bg-zinc-800 rounded-full h-1 sm:h-1.5 my-0.5 sm:my-1">
                <div
                  className={`${theme.bar} h-1 sm:h-1.5 rounded-full`}
                  style={{ width: `${Math.min(100, Math.max(0, stat.progress))}%` }}
                />
              </div>
            )}
            {stat.subtext && (
              <span className="text-[9px] sm:text-[10px] text-zinc-500 block truncate">
                {stat.subtext}
              </span>
            )}
          </div>
        ))}
      </div>
    </Link>
  );
};
export default DynamicCard;
