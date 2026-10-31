import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MobileBottomNav } from '../components/layout/MobileBottomNav';
import { OfflineBanner } from '../components/common/OfflineBanner';
import { PwaInstallModal } from '../components/common/PwaInstallModal';

describe('PWA & Mobile Navigation Components', () => {
  it('renders MobileBottomNav and handles drawer click', () => {
    const handleOpenDrawer = vi.fn();
    render(
      <MemoryRouter>
        <MobileBottomNav onOpenDrawer={handleOpenDrawer} />
      </MemoryRouter>
    );

    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Fitness')).toBeInTheDocument();
    expect(screen.getByText('Water')).toBeInTheDocument();
    expect(screen.getByText('Money')).toBeInTheDocument();
    
    const moreBtn = screen.getByRole('button', { name: /more/i });
    expect(moreBtn).toBeInTheDocument();
    fireEvent.click(moreBtn);
    expect(handleOpenDrawer).toHaveBeenCalledTimes(1);
  });

  it('renders PwaInstallModal with title and app name', () => {
    const handleClose = vi.fn();
    render(
      <PwaInstallModal isOpen={true} onClose={handleClose} />
    );

    expect(screen.getByRole('heading', { level: 3, name: 'Install LIFORA' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 4, name: 'LIFORA' })).toBeInTheDocument();
    expect(screen.getByText('PWA v2.0')).toBeInTheDocument();
  });
});
