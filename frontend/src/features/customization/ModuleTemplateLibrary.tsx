import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  BookOpen,
  Sparkles,
  Car,
  CreditCard,
  GraduationCap,
  Plane,
  ShoppingBag,
  Target,
  Activity,
  Briefcase,
  CheckCircle2,
  Plus,
  ArrowRight,
  Layers,
} from 'lucide-react';
import { api } from '../../services/api';
import { Button } from '../../components/common/Button';

export interface TemplateDefinition {
  id: string;
  name: string;
  category: string;
  icon: string;
  description: string;
  fields: Array<{
    name: string;
    label: string;
    field_type: string;
    is_required: boolean;
    options?: string[];
    default_value?: any;
    order: number;
  }>;
}

export const LIFORA_TEMPLATES: TemplateDefinition[] = [
  {
    id: 'book-tracker',
    name: 'Book Tracker',
    category: 'Lifestyle',
    icon: 'Folder',
    description: 'Track reading progress, book reviews, ratings, and genre collections.',
    fields: [
      { name: 'title', label: 'Book Title', field_type: 'text', is_required: true, order: 0 },
      { name: 'author', label: 'Author', field_type: 'text', is_required: true, order: 1 },
      {
        name: 'genre',
        label: 'Genre',
        field_type: 'select',
        is_required: false,
        options: ['Fiction', 'Non-Fiction', 'Self-Help', 'Tech', 'Sci-Fi', 'Biography', 'Philosophy'],
        order: 2,
      },
      { name: 'total_pages', label: 'Total Pages', field_type: 'number', is_required: true, order: 3 },
      { name: 'pages_read', label: 'Pages Read', field_type: 'number', is_required: true, order: 4 },
      {
        name: 'status',
        label: 'Status',
        field_type: 'select',
        is_required: true,
        options: ['Want to Read', 'Currently Reading', 'Completed', 'Abandoned'],
        order: 5,
      },
      { name: 'rating', label: 'Rating (1-5)', field_type: 'rating', is_required: false, order: 6 },
      { name: 'notes', label: 'Personal Review & Quotes', field_type: 'textarea', is_required: false, order: 7 },
    ],
  },
  {
    id: 'habit-tracker',
    name: 'Habit Tracker',
    category: 'Productivity',
    icon: 'CheckSquare',
    description: 'Daily and weekly habit checklists with streak and time-of-day tracking.',
    fields: [
      { name: 'habit_name', label: 'Habit Name', field_type: 'text', is_required: true, order: 0 },
      {
        name: 'frequency',
        label: 'Frequency',
        field_type: 'select',
        is_required: true,
        options: ['Daily', 'Weekdays', 'Weekends', 'Weekly'],
        order: 1,
      },
      { name: 'target', label: 'Target / Duration', field_type: 'text', is_required: false, order: 2 },
      { name: 'streak', label: 'Current Streak (Days)', field_type: 'number', is_required: false, order: 3 },
      {
        name: 'time_of_day',
        label: 'Time of Day',
        field_type: 'select',
        is_required: false,
        options: ['Morning', 'Afternoon', 'Evening', 'Anytime'],
        order: 4,
      },
      { name: 'completed_today', label: 'Completed Today', field_type: 'checkbox', is_required: false, order: 5 },
    ],
  },
  {
    id: 'vehicle-maintenance',
    name: 'Vehicle Maintenance',
    category: 'Personal',
    icon: 'Wrench',
    description: 'Log service dates, oil changes, mileage readings, and maintenance receipts.',
    fields: [
      { name: 'vehicle_name', label: 'Vehicle Name / Model', field_type: 'text', is_required: true, order: 0 },
      {
        name: 'service_type',
        label: 'Service Type',
        field_type: 'select',
        is_required: true,
        options: ['Oil Change', 'Tire Rotation', 'Brake Service', 'Battery', 'General Inspection', 'Insurance Renewal'],
        order: 1,
      },
      { name: 'service_date', label: 'Service Date', field_type: 'date', is_required: true, order: 2 },
      { name: 'odometer_km', label: 'Odometer (km)', field_type: 'number', is_required: false, order: 3 },
      { name: 'cost', label: 'Total Cost (₹)', field_type: 'currency', is_required: false, order: 4 },
      { name: 'service_center', label: 'Service Center / Mechanic', field_type: 'text', is_required: false, order: 5 },
      { name: 'next_due_date', label: 'Next Due Date', field_type: 'date', is_required: false, order: 6 },
    ],
  },
  {
    id: 'subscription-tracker',
    name: 'Subscription Tracker',
    category: 'Finance',
    icon: 'Repeat',
    description: 'Monitor recurring software, streaming services, renew dates, and monthly spend.',
    fields: [
      { name: 'service_name', label: 'Subscription / Service Name', field_type: 'text', is_required: true, order: 0 },
      {
        name: 'category',
        label: 'Category',
        field_type: 'select',
        is_required: false,
        options: ['Entertainment', 'Productivity', 'Cloud & Dev', 'Utilities', 'Health & Fitness', 'Other'],
        order: 1,
      },
      {
        name: 'billing_cycle',
        label: 'Billing Cycle',
        field_type: 'select',
        is_required: true,
        options: ['Monthly', 'Quarterly', 'Annual', 'Lifetime'],
        order: 2,
      },
      { name: 'amount', label: 'Amount (₹)', field_type: 'currency', is_required: true, order: 3 },
      { name: 'renewal_date', label: 'Next Renewal Date', field_type: 'date', is_required: false, order: 4 },
      { name: 'auto_renew', label: 'Auto-Renew Active', field_type: 'checkbox', is_required: false, order: 5 },
      { name: 'is_active', label: 'Currently Subscribed', field_type: 'checkbox', is_required: false, order: 6 },
    ],
  },
  {
    id: 'learning-tracker',
    name: 'Learning Tracker',
    category: 'Education',
    icon: 'Compass',
    description: 'Keep track of online courses, skills development, hours spent, and certifications.',
    fields: [
      { name: 'skill_name', label: 'Course or Skill Title', field_type: 'text', is_required: true, order: 0 },
      {
        name: 'platform',
        label: 'Platform / Source',
        field_type: 'select',
        is_required: false,
        options: ['Coursera', 'Udemy', 'YouTube', 'Documentation', 'Book', 'Bootcamp'],
        order: 1,
      },
      { name: 'progress_percent', label: 'Progress (%)', field_type: 'slider', is_required: false, order: 2 },
      { name: 'hours_spent', label: 'Hours Invested', field_type: 'number', is_required: false, order: 3 },
      {
        name: 'status',
        label: 'Status',
        field_type: 'select',
        is_required: true,
        options: ['In Progress', 'Completed', 'On Hold', 'Planned'],
        order: 4,
      },
      { name: 'certificate_url', label: 'Certificate / Project Link', field_type: 'url', is_required: false, order: 5 },
    ],
  },
  {
    id: 'travel-planner',
    name: 'Travel Planner',
    category: 'Lifestyle',
    icon: 'MapPin',
    description: 'Plan upcoming journeys, itineraries, booking refs, packing lists, and budgets.',
    fields: [
      { name: 'destination', label: 'Destination / City', field_type: 'text', is_required: true, order: 0 },
      { name: 'departure_date', label: 'Departure Date', field_type: 'date', is_required: true, order: 1 },
      { name: 'return_date', label: 'Return Date', field_type: 'date', is_required: false, order: 2 },
      { name: 'budget', label: 'Estimated Budget (₹)', field_type: 'currency', is_required: false, order: 3 },
      { name: 'hotel_booking_ref', label: 'Flight / Hotel Booking Ref', field_type: 'text', is_required: false, order: 4 },
      { name: 'packing_list', label: 'Packing Checklist', field_type: 'textarea', is_required: false, order: 5 },
      { name: 'notes', label: 'Places to Visit & Itinerary', field_type: 'textarea', is_required: false, order: 6 },
    ],
  },
  {
    id: 'shopping-list',
    name: 'Shopping List',
    category: 'Personal',
    icon: 'Folder',
    description: 'Organize grocery lists, wishlist hardware, priorities, and purchases.',
    fields: [
      { name: 'item_name', label: 'Item Name', field_type: 'text', is_required: true, order: 0 },
      {
        name: 'category',
        label: 'Category',
        field_type: 'select',
        is_required: false,
        options: ['Groceries', 'Household', 'Electronics', 'Clothing', 'Supplements', 'Other'],
        order: 1,
      },
      { name: 'estimated_cost', label: 'Estimated Cost (₹)', field_type: 'currency', is_required: false, order: 2 },
      { name: 'store', label: 'Store / Link', field_type: 'text', is_required: false, order: 3 },
      {
        name: 'priority',
        label: 'Priority',
        field_type: 'select',
        is_required: true,
        options: ['High', 'Medium', 'Low'],
        order: 4,
      },
      { name: 'purchased', label: 'Purchased / Done', field_type: 'checkbox', is_required: false, order: 5 },
    ],
  },
  {
    id: 'personal-goals',
    name: 'Personal Goals',
    category: 'Productivity',
    icon: 'Flame',
    description: 'Set ambitious milestones, target dates, priorities, and track execution.',
    fields: [
      { name: 'goal_title', label: 'Goal Title', field_type: 'text', is_required: true, order: 0 },
      {
        name: 'category',
        label: 'Category',
        field_type: 'select',
        is_required: false,
        options: ['Career', 'Health & Body', 'Financial', 'Personal Growth', 'Creative'],
        order: 1,
      },
      { name: 'target_date', label: 'Target Completion Date', field_type: 'date', is_required: false, order: 2 },
      { name: 'current_milestone', label: 'Next Immediate Milestone', field_type: 'text', is_required: false, order: 3 },
      {
        name: 'status',
        label: 'Status',
        field_type: 'select',
        is_required: true,
        options: ['Not Started', 'In Progress', 'Achieved', 'Deferred'],
        order: 4,
      },
      {
        name: 'priority',
        label: 'Priority',
        field_type: 'select',
        is_required: true,
        options: ['Urgent', 'High', 'Medium', 'Low'],
        order: 5,
      },
    ],
  },
  {
    id: 'medicine-schedule',
    name: 'Medicine Schedule',
    category: 'Health',
    icon: 'Activity',
    description: 'Keep track of daily medications, dosages, prescribed intervals, and refill dates.',
    fields: [
      { name: 'medicine_name', label: 'Medicine / Supplement Name', field_type: 'text', is_required: true, order: 0 },
      { name: 'dosage', label: 'Dosage (e.g. 500mg, 1 tablet)', field_type: 'text', is_required: true, order: 1 },
      {
        name: 'frequency',
        label: 'Frequency',
        field_type: 'select',
        is_required: true,
        options: ['Once Daily', 'Twice Daily', 'Thrice Daily', 'Weekly', 'As Needed'],
        order: 2,
      },
      { name: 'scheduled_time', label: 'Time (e.g. 08:00 AM, Post-Meal)', field_type: 'text', is_required: false, order: 3 },
      { name: 'prescribed_for', label: 'Prescribed For / Purpose', field_type: 'text', is_required: false, order: 4 },
      { name: 'refill_date', label: 'Refill Due Date', field_type: 'date', is_required: false, order: 5 },
    ],
  },
  {
    id: 'project-tracker',
    name: 'Project Tracker',
    category: 'Work',
    icon: 'Briefcase',
    description: 'Track ongoing software, client, or freelance projects, hours, and deadlines.',
    fields: [
      { name: 'project_name', label: 'Project Name', field_type: 'text', is_required: true, order: 0 },
      { name: 'scope', label: 'Client / Scope Description', field_type: 'text', is_required: false, order: 1 },
      { name: 'deadline', label: 'Target Deadline', field_type: 'date', is_required: false, order: 2 },
      {
        name: 'status',
        label: 'Status',
        field_type: 'select',
        is_required: true,
        options: ['Planning', 'Active', 'Review', 'Completed', 'Archived'],
        order: 3,
      },
      { name: 'hours_logged', label: 'Hours Logged', field_type: 'number', is_required: false, order: 4 },
      { name: 'repository_link', label: 'GitHub / Documentation Link', field_type: 'url', is_required: false, order: 5 },
    ],
  },
];

export const ModuleTemplateLibrary: React.FC<{ onModuleCreated?: () => void }> = ({ onModuleCreated }) => {
  const queryClient = useQueryClient();
  const [createdTemplateId, setCreatedTemplateId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const instantiateMutation = useMutation({
    mutationFn: async (tpl: TemplateDefinition) => {
      setIsCreating(true);
      setErrorMessage(null);
      const resp = await api.post('/custom-modules', {
        name: tpl.name,
        description: tpl.description,
        icon: tpl.icon,
        category: tpl.category,
        placements: ['dashboard', 'sidebar', 'more_menu', 'quick_actions'],
        fields: tpl.fields,
      });
      return resp.data;
    },
    onSuccess: (data, tpl) => {
      queryClient.invalidateQueries({ queryKey: ['custom-modules'] });
      setCreatedTemplateId(tpl.id);
      setIsCreating(false);
      setTimeout(() => setCreatedTemplateId(null), 3000);
      if (onModuleCreated) onModuleCreated();
    },
    onError: (err: any) => {
      setIsCreating(false);
      setErrorMessage(err.response?.data?.detail || 'Failed to create module from template.');
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-400" />
            <span>LIFORA Module Template Library</span>
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            1-click instant activation of pre-configured tracking modules with custom fields and dashboard placements.
          </p>
        </div>
      </div>

      {errorMessage && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/25 rounded-xl text-rose-300 text-xs">
          {errorMessage}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {LIFORA_TEMPLATES.map((tpl) => {
          const isJustCreated = createdTemplateId === tpl.id;
          return (
            <div
              key={tpl.id}
              className="bg-[#031d1a]/80 border border-emerald-950/80 hover:border-emerald-500/40 rounded-2xl p-4 sm:p-5 transition-all shadow-md flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-bold shrink-0">
                      <Layers className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-zinc-100 text-sm leading-tight">{tpl.name}</h4>
                      <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">
                        {tpl.category}
                      </span>
                    </div>
                  </div>

                  <span className="text-[10px] bg-zinc-900 border border-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full font-mono">
                    {tpl.fields.length} fields
                  </span>
                </div>

                <p className="text-xs text-zinc-400 mb-3 leading-relaxed">{tpl.description}</p>

                {/* Field Tags Preview */}
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {tpl.fields.slice(0, 4).map((f) => (
                    <span
                      key={f.name}
                      className="text-[10px] px-2 py-0.5 rounded-md bg-[#021816] border border-emerald-900/40 text-emerald-300 font-mono"
                    >
                      {f.label} ({f.field_type})
                    </span>
                  ))}
                  {tpl.fields.length > 4 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md text-zinc-500">
                      +{tpl.fields.length - 4} more
                    </span>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-emerald-950/60 flex items-center justify-between">
                <span className="text-[11px] text-zinc-500">Auto-adds to Dashboard &amp; Sidebar</span>
                <button
                  type="button"
                  disabled={isCreating || isJustCreated}
                  onClick={() => instantiateMutation.mutate(tpl)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 ${
                    isJustCreated
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold shadow-md shadow-emerald-500/20'
                  }`}
                >
                  {isJustCreated ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Added!</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      <span>Use Template</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
export default ModuleTemplateLibrary;
