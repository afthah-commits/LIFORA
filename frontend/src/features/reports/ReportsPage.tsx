import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  FileSpreadsheet,
  Download,
  FileText,
  FileCode,
  Calendar,
  Award,
  Flame,
  Dumbbell,
  Footprints,
  Scale,
  Sparkles,
} from 'lucide-react';
import { api } from '../../services/api';
import { Card, CardHeader, CardTitle } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { ReportData } from '../../types';

export const ReportsPage: React.FC = () => {
  const [reportDays, setReportDays] = useState<number>(7);

  // Fetch Report Data
  const { data: report, isLoading, refetch } = useQuery<ReportData>({
    queryKey: ['report-data', reportDays],
    queryFn: async () => {
      const resp = await api.get(`/reports/data?days=${reportDays}`);
      return resp.data;
    },
  });

  const handleDownload = async (format: 'pdf' | 'csv' | 'json') => {
    try {
      const response = await api.get(`/reports/export/${format}?days=${reportDays}`, {
        responseType: 'blob',
      });

      const blob = new Blob([response.data], {
        type:
          format === 'pdf'
            ? 'application/pdf'
            : format === 'csv'
            ? 'text/csv'
            : 'application/json',
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `fitpulse_${reportDays}d_report.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(`Error downloading ${format} report:`, err);
    }
  };

  const nutr = report?.nutrition_summary || {};
  const wo = report?.workout_summary || {};
  const rn = report?.running_summary || {};
  const fb = report?.football_summary || {};
  const wt = report?.weight_summary || {};
  const comp = report?.data_completeness || {};
  const goal = report?.goal_completion || {};

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100 flex items-center gap-2.5">
            <FileSpreadsheet className="w-6 h-6 text-emerald-400" />
            Performance Reports & Data Export
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Generate comprehensive fitness performance dossiers and export to PDF, CSV, or AI-ready JSON.
          </p>
        </div>

        {/* Toggle Weekly vs Monthly */}
        <div className="flex items-center gap-1.5 p-1 bg-[#121215] border border-zinc-800 rounded-xl">
          <button
            onClick={() => setReportDays(7)}
            className={`text-xs px-3.5 py-1.5 rounded-lg font-medium transition-colors ${
              reportDays === 7
                ? 'bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/20'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Weekly Report (7 Days)
          </button>
          <button
            onClick={() => setReportDays(30)}
            className={`text-xs px-3.5 py-1.5 rounded-lg font-medium transition-colors ${
              reportDays === 30
                ? 'bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/20'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Monthly Report (30 Days)
          </button>
        </div>
      </div>

      {/* Export Action Bar */}
      <Card className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-gradient-to-r from-[#121215] to-[#151c17] border-zinc-800">
        <div>
          <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block">
            {reportDays === 7 ? '7-Day Summary Dossier' : '30-Day Monthly Digest'}
          </span>
          <p className="text-sm font-semibold text-zinc-100 mt-0.5">
            {report?.start_date} to {report?.end_date}
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            size="sm"
            variant="primary"
            onClick={() => handleDownload('pdf')}
            leftIcon={<FileText className="w-4 h-4" />}
          >
            Download PDF
          </Button>

          <Button
            size="sm"
            variant="secondary"
            onClick={() => handleDownload('csv')}
            leftIcon={<Download className="w-4 h-4" />}
          >
            Export CSV
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => handleDownload('json')}
            leftIcon={<FileCode className="w-4 h-4" />}
          >
            AI-Ready JSON
          </Button>
        </div>
      </Card>

      {/* Report Summary Panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 1. Nutrition Summary */}
        <Card>
          <CardHeader>
            <CardTitle>
              <Flame className="w-4 h-4 text-emerald-400" />
              1. Nutrition & Protein Summary
            </CardTitle>
            <Badge variant="emerald" size="sm">
              {comp.nutrition_logging_rate || 0}% Logging Rate
            </Badge>
          </CardHeader>

          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between py-1.5 border-b border-zinc-800/60">
              <span className="text-zinc-400">Days Logged:</span>
              <strong className="text-zinc-100 font-mono">
                {nutr.recorded_days || 0} of {nutr.total_days || reportDays} days
              </strong>
            </div>
            <div className="flex justify-between py-1.5 border-b border-zinc-800/60">
              <span className="text-zinc-400">Average Daily Calories:</span>
              <strong className="text-zinc-100 font-mono">
                {nutr.average_calories ? `${nutr.average_calories} kcal` : 'No logs'}
              </strong>
            </div>
            <div className="flex justify-between py-1.5 border-b border-zinc-800/60">
              <span className="text-zinc-400">Average Daily Protein:</span>
              <strong className="text-emerald-400 font-mono">
                {nutr.average_protein_g ? `${nutr.average_protein_g} g` : 'No logs'}
              </strong>
            </div>
            <div className="flex justify-between py-1.5 border-b border-zinc-800/60">
              <span className="text-zinc-400">Target Protein (85g) Met Days:</span>
              <strong className="text-zinc-100 font-mono">
                {nutr.protein_goal_met_days || 0} days ({nutr.protein_goal_completion_rate || 0}%)
              </strong>
            </div>
          </div>
        </Card>

        {/* 2. Physical Activities */}
        <Card>
          <CardHeader>
            <CardTitle>
              <Dumbbell className="w-4 h-4 text-emerald-400" />
              2. Training & Cardio Volume
            </CardTitle>
          </CardHeader>

          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between py-1.5 border-b border-zinc-800/60">
              <span className="text-zinc-400">Strength Sessions:</span>
              <strong className="text-zinc-100 font-mono">
                {wo.total_sessions || 0} sessions ({wo.total_duration_minutes || 0} mins)
              </strong>
            </div>
            <div className="flex justify-between py-1.5 border-b border-zinc-800/60">
              <span className="text-zinc-400">Running Total Distance:</span>
              <strong className="text-emerald-400 font-mono">
                {rn.total_distance_km || 0} km ({rn.total_sessions || 0} runs)
              </strong>
            </div>
            <div className="flex justify-between py-1.5 border-b border-zinc-800/60">
              <span className="text-zinc-400">Average Running Pace:</span>
              <strong className="text-zinc-100 font-mono">{rn.average_pace || 'N/A'}</strong>
            </div>
            <div className="flex justify-between py-1.5 border-b border-zinc-800/60">
              <span className="text-zinc-400">Football Sessions:</span>
              <strong className="text-purple-400 font-mono">
                {fb.total_sessions || 0} matches ({fb.total_duration_minutes || 0} mins)
              </strong>
            </div>
          </div>
        </Card>

        {/* 3. Body Weight Progression */}
        <Card>
          <CardHeader>
            <CardTitle>
              <Scale className="w-4 h-4 text-emerald-400" />
              3. Weight & Target Progression
            </CardTitle>
          </CardHeader>

          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between py-1.5 border-b border-zinc-800/60">
              <span className="text-zinc-400">Starting Period Weight:</span>
              <strong className="text-zinc-100 font-mono">
                {wt.start_weight_kg ? `${wt.start_weight_kg} kg` : 'N/A'}
              </strong>
            </div>
            <div className="flex justify-between py-1.5 border-b border-zinc-800/60">
              <span className="text-zinc-400">Latest Period Weight:</span>
              <strong className="text-zinc-100 font-mono">
                {wt.latest_weight_kg ? `${wt.latest_weight_kg} kg` : 'N/A'}
              </strong>
            </div>
            <div className="flex justify-between py-1.5 border-b border-zinc-800/60">
              <span className="text-zinc-400">Net Period Change:</span>
              <strong className="text-emerald-400 font-mono">
                {wt.weight_change_kg !== null && wt.weight_change_kg !== undefined
                  ? `${wt.weight_change_kg > 0 ? '+' : ''}${wt.weight_change_kg} kg`
                  : 'N/A'}
              </strong>
            </div>
            <div className="flex justify-between py-1.5 border-b border-zinc-800/60">
              <span className="text-zinc-400">Target Goal:</span>
              <strong className="text-zinc-100 font-mono">{wt.target_weight_kg || 60} kg</strong>
            </div>
          </div>
        </Card>

        {/* 4. AI Readiness Callout */}
        <Card className="bg-[#101412] border-emerald-500/20">
          <CardHeader>
            <CardTitle className="text-emerald-400">
              <Sparkles className="w-4 h-4" />
              AI Assistant Interoperability
            </CardTitle>
          </CardHeader>

          <p className="text-xs text-zinc-300 leading-relaxed mb-4">
            The exported JSON format follows FITPULSE AI's standardized schema. It includes verified database metrics, data logging completeness ratios, and goal benchmarks, allowing you to feed it directly to external LLMs or your local AI assistant for customized fitness periodization advice.
          </p>

          <Button
            size="sm"
            variant="outline"
            className="w-full text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/10"
            onClick={() => handleDownload('json')}
            leftIcon={<FileCode className="w-4 h-4" />}
          >
            Copy / Download JSON Payload
          </Button>
        </Card>
      </div>
    </div>
  );
};
