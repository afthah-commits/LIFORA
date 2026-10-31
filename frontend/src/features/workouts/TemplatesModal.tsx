import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dumbbell, Plus, Trash2, Play } from 'lucide-react';
import { api } from '../../services/api';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { WorkoutTemplate } from '../../types';

export interface TemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (template: WorkoutTemplate) => void;
}

export const TemplatesModal: React.FC<TemplatesModalProps> = ({
  isOpen,
  onClose,
  onSelectTemplate,
}) => {
  const queryClient = useQueryClient();

  const { data: templates = [], isLoading } = useQuery<WorkoutTemplate[]>({
    queryKey: ['workout-templates'],
    queryFn: async () => {
      const resp = await api.get('/workouts/templates/all');
      return resp.data;
    },
    enabled: isOpen,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/workouts/templates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workout-templates'] });
    },
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Workout Templates"
      description="Select a template routine to quickly populate a new workout session"
      maxWidth="md"
    >
      <div className="space-y-3">
        {templates.length > 0 ? (
          <div className="space-y-2.5 max-h-80 overflow-y-auto">
            {templates.map((tpl) => (
              <div
                key={tpl.id}
                className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800 flex items-center justify-between gap-3"
              >
                <div>
                  <h4 className="text-sm font-semibold text-zinc-200">{tpl.name}</h4>
                  {tpl.description && (
                    <p className="text-xs text-zinc-400 mt-0.5">{tpl.description}</p>
                  )}
                  <div className="text-[11px] text-zinc-500 mt-1 font-mono">
                    {tpl.items.length} exercise movements defined
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => deleteMutation.mutate(tpl.id)}
                    className="p-1.5 text-zinc-500 hover:text-rose-400 transition-colors"
                    title="Delete template"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => {
                      onSelectTemplate(tpl);
                      onClose();
                    }}
                    leftIcon={<Play className="w-3.5 h-3.5 fill-current" />}
                  >
                    Use
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-zinc-500 text-xs border border-dashed border-zinc-800 rounded-xl">
            No templates created yet. You can log standard sessions directly.
          </div>
        )}

        <div className="flex justify-end pt-3 border-t border-zinc-800">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};
