import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { Card, CardHeader, CardTitle } from '../components/common/Card';
import { EmptyState } from '../components/common/EmptyState';
import { Input } from '../components/common/Input';
import { Dumbbell } from 'lucide-react';

describe('Common UI Components', () => {
  it('renders Button with variants and handles click events', () => {
    const handleClick = vi.fn();
    render(
      <Button variant="primary" onClick={handleClick}>
        Save Workout
      </Button>
    );

    const btn = screen.getByRole('button', { name: /save workout/i });
    expect(btn).toBeInTheDocument();
    fireEvent.click(btn);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('renders Badge with custom colors', () => {
    render(<Badge variant="emerald">85g Protein Target</Badge>);
    expect(screen.getByText('85g Protein Target')).toBeInTheDocument();
  });

  it('renders Card with Header and Title', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Daily Nutrition</CardTitle>
        </CardHeader>
        <p>2500 kcal logged</p>
      </Card>
    );

    expect(screen.getByText('Daily Nutrition')).toBeInTheDocument();
    expect(screen.getByText('2500 kcal logged')).toBeInTheDocument();
  });

  it('renders EmptyState with action button', () => {
    const handleAction = vi.fn();
    render(
      <EmptyState
        icon={<Dumbbell data-testid="dumbbell-icon" />}
        title="No Workouts Found"
        description="Log your first session"
        actionLabel="Log Now"
        onAction={handleAction}
      />
    );

    expect(screen.getByText('No Workouts Found')).toBeInTheDocument();
    const actionBtn = screen.getByRole('button', { name: /log now/i });
    fireEvent.click(actionBtn);
    expect(handleAction).toHaveBeenCalledTimes(1);
  });

  it('renders Input with error message', () => {
    render(
      <Input
        label="Protein Goal"
        error="Target must be positive"
        placeholder="85"
      />
    );

    expect(screen.getByText('Protein Goal')).toBeInTheDocument();
    expect(screen.getByText('Target must be positive')).toBeInTheDocument();
  });
});
