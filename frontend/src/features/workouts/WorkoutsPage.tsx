import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dumbbell,
  Plus,
  Bookmark,
  Trash2,
  Calendar,
  Clock,
  Layers,
  Search,
} from 'lucide-react';
import { api } from '../../services/api';
import { Card, CardHeader, CardTitle } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { EmptyState } from '../../components/common/EmptyState';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { LogWorkoutModal } from './LogWorkoutModal';
import { AddCustomExerciseModal } from './AddCustomExerciseModal';
import { TemplatesModal } from './TemplatesModal';
import { WorkoutSession, Exercise, WorkoutTemplate } from '../../types';

export const WorkoutsPage: React.FC = () => {
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'sessions' | 'library'>('sessions');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [exerciseSearch, setExerciseSearch] = useState('');

  // Modals state
  const [isLogOpen, setIsLogOpen] = useState(false);
  const [isAddExerciseOpen, setIsAddExerciseOpen] = useState(false);
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false);
  const [templateToLoad, setTemplateToLoad] = useState<WorkoutTemplate | null>(null);
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);

  // 1. Fetch Sessions
  const { data: sessions = [], isLoading: loadingSessions } = useQuery<WorkoutSession[]>({
    queryKey: ['workout-sessions'],
    queryFn: async () => {
      const resp = await api.get('/workouts');
      return resp.data;
    },
  });

  // 2. Fetch Exercises
  const { data: exercises = [], isLoading: loadingExercises } = useQuery<Exercise[]>({
    queryKey: ['exercises-all', exerciseSearch, selectedCategory],
    queryFn: async () => {
      const catParam = selectedCategory !== 'All' ? `&category=${encodeURIComponent(selectedCategory)}` : '';
      const resp = await api.get(`/exercises?search=${encodeURIComponent(exerciseSearch)}${catParam}`);
      return resp.data;
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/workouts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workout-sessions'] });
      setDeletingSessionId(null);
    },
  });

  const categories = ['All', 'Dumbbells', 'Resistance bands', 'Bodyweight', 'General strength'];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100 flex items-center gap-2.5">
            <Dumbbell className="w-6 h-6 text-emerald-400" />
            Workout & Strength Tracker
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Log dumbbell routines, bodyweight calisthenics, and progressive overload sets.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            variant="outline"
            leftIcon={<Bookmark className="w-4 h-4" />}
            onClick={() => setIsTemplatesOpen(true)}
          >
            Templates
          </Button>

          <Button
            size="sm"
            variant="secondary"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => setIsAddExerciseOpen(true)}
          >
            New Exercise
          </Button>

          <Button
            size="sm"
            variant="primary"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => {
              setTemplateToLoad(null);
              setIsLogOpen(true);
            }}
          >
            Log Workout
          </Button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-zinc-800 pb-2">
        <button
          onClick={() => setActiveTab('sessions')}
          className={`text-sm font-semibold px-4 py-2 rounded-lg transition-colors ${
            activeTab === 'sessions'
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Logged Sessions ({sessions.length})
        </button>
        <button
          onClick={() => setActiveTab('library')}
          className={`text-sm font-semibold px-4 py-2 rounded-lg transition-colors ${
            activeTab === 'library'
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Exercise Movement Library ({exercises.length})
        </button>
      </div>

      {/* Tab 1: Workout Sessions History */}
      {activeTab === 'sessions' && (
        <div className="space-y-4">
          {sessions.length > 0 ? (
            <div className="grid grid-cols-1 gap-4">
              {sessions.map((session) => (
                <Card key={session.id} hoverEffect>
                  <CardHeader>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-base text-zinc-100">{session.name}</span>
                        <Badge variant="emerald" size="sm">{session.duration_minutes} min</Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-zinc-400 mt-1">
                        <span className="flex items-center gap-1 font-mono">
                          <Calendar className="w-3.5 h-3.5" />
                          {session.date}
                        </span>
                        <span className="flex items-center gap-1 font-mono">
                          <Layers className="w-3.5 h-3.5" />
                          {session.total_sets} sets completed
                        </span>
                        <span className="text-emerald-400 font-mono font-medium">
                          {session.total_volume_kg} kg volume
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => setDeletingSessionId(session.id)}
                      className="p-1.5 text-zinc-500 hover:text-rose-400 rounded transition-colors"
                      title="Delete workout session"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </CardHeader>

                  {/* Exercises in Session */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 mt-2">
                    {session.exercises.map((ex) => (
                      <div
                        key={ex.id}
                        className="p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800/80 text-xs flex justify-between items-center"
                      >
                        <span className="font-medium text-zinc-200 truncate">{ex.exercise_name}</span>
                        <span className="text-zinc-400 font-mono shrink-0 ml-2">
                          {ex.sets} × {ex.reps} @ {ex.weight_kg}kg
                        </span>
                      </div>
                    ))}
                  </div>

                  {session.notes && (
                    <p className="text-xs text-zinc-400 italic mt-3 pt-2 border-t border-zinc-800/60">
                      Note: {session.notes}
                    </p>
                  )}
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Dumbbell className="w-6 h-6" />}
              title="No workout sessions recorded yet"
              description="Log your first dumbbell or strength workout to start tracking your progressive overload and volume."
              actionLabel="Log Workout"
              onAction={() => setIsLogOpen(true)}
            />
          )}
        </div>
      )}

      {/* Tab 2: Exercise Library */}
      {activeTab === 'library' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors shrink-0 ${
                    selectedCategory === cat
                      ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400'
                      : 'bg-[#18181b] border-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search movements..."
                value={exerciseSearch}
                onChange={(e) => setExerciseSearch(e.target.value)}
                className="w-full bg-[#18181b] border border-zinc-800 rounded-lg pl-9 pr-3.5 py-1.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Exercise Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {exercises.map((ex) => (
              <Card key={ex.id} hoverEffect className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-semibold text-sm text-zinc-100">{ex.name}</h4>
                  <Badge variant="zinc" size="sm">
                    {ex.category}
                  </Badge>
                </div>
                <p className="text-xs text-emerald-400 font-medium">
                  Target: {ex.target_muscle}
                </p>
                {ex.description && (
                  <p className="text-xs text-zinc-400 mt-2 line-clamp-2 leading-relaxed">
                    {ex.description}
                  </p>
                )}
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Modals */}
      <LogWorkoutModal
        isOpen={isLogOpen}
        onClose={() => setIsLogOpen(false)}
        onSaved={() => {
          queryClient.invalidateQueries({ queryKey: ['workout-sessions'] });
        }}
        templateToLoad={templateToLoad}
      />

      <AddCustomExerciseModal
        isOpen={isAddExerciseOpen}
        onClose={() => setIsAddExerciseOpen(false)}
        onSaved={() => {
          queryClient.invalidateQueries({ queryKey: ['exercises-all'] });
          queryClient.invalidateQueries({ queryKey: ['exercises-library'] });
        }}
      />

      <TemplatesModal
        isOpen={isTemplatesOpen}
        onClose={() => setIsTemplatesOpen(false)}
        onSelectTemplate={(tpl) => {
          setTemplateToLoad(tpl);
          setIsLogOpen(true);
        }}
      />

      <ConfirmDialog
        isOpen={!!deletingSessionId}
        onClose={() => setDeletingSessionId(null)}
        onConfirm={() => {
          if (deletingSessionId) deleteMutation.mutate(deletingSessionId);
        }}
        title="Delete Workout Session"
        message="Are you sure you want to permanently delete this workout session record?"
        confirmLabel="Delete Session"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
};
