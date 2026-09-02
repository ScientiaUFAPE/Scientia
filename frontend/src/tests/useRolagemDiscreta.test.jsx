import { useRef } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useRolagemDiscreta } from '../utils/useRolagemDiscreta.js';

function Caixa() {
  const alvo = useRef(null);

  useRolagemDiscreta(alvo);

  return <div data-testid="caixa" className="rolagem-discreta" ref={alvo} />;
}

describe('Rolagem discreta', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('mostra a barra ao rolar e a apaga depois da espera', () => {
    render(<Caixa />);
    const caixa = screen.getByTestId('caixa');

    fireEvent.scroll(caixa);
    expect(caixa).toHaveClass('rolando');

    act(() => {
      vi.advanceTimersByTime(899);
    });
    expect(caixa).toHaveClass('rolando');

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(caixa).not.toHaveClass('rolando');
  });

  it('mostra ao mover o ponteiro e apaga assim que ele sai', () => {
    render(<Caixa />);
    const caixa = screen.getByTestId('caixa');

    fireEvent.mouseMove(caixa);
    expect(caixa).toHaveClass('rolando');

    fireEvent.mouseLeave(caixa);
    expect(caixa).not.toHaveClass('rolando');
  });
});
