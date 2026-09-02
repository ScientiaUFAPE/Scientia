import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { PainelRapido } from '../componentes/PainelRapido.jsx';

const FATOS = [
  { termo: 'Veículo', valor: 'Revista Brasileira de Computação' },
  { termo: 'Área de pesquisa', valor: 'Inteligência Artificial' },
];

function renderizarPainel(extras = {}) {
  const aoFechar = vi.fn();

  render(
    <MemoryRouter>
      <PainelRapido
        rotulo="Artigo · 2024"
        titulo="Análise de desempenho de algoritmos de aprendizado"
        fatos={FATOS}
        aoFechar={aoFechar}
        {...extras}
      />
    </MemoryRouter>,
  );

  return aoFechar;
}

describe('Painel de olhar rápido', () => {
  it('mostra o rótulo, o título e os fatos em lista de definição', () => {
    renderizarPainel({ paginaCompleta: '/publicacoes/1' });

    const painel = screen.getByRole('complementary');

    expect(within(painel).getByText('Artigo · 2024')).toBeInTheDocument();
    expect(
      within(painel).getByRole('heading', {
        name: 'Análise de desempenho de algoritmos de aprendizado',
      }),
    ).toBeInTheDocument();
    expect(within(painel).getByText('Veículo')).toBeInTheDocument();
    expect(within(painel).getByText('Revista Brasileira de Computação')).toBeInTheDocument();
    expect(within(painel).getByRole('link', { name: 'Abrir página completa' })).toHaveAttribute(
      'href',
      '/publicacoes/1',
    );
  });

  it('sem página completa, não oferece o botão primário', () => {
    renderizarPainel();

    expect(screen.queryByRole('link', { name: 'Abrir página completa' })).not.toBeInTheDocument();
  });

  it('fecha pelo botão, pelo Esc e pelo clique fora', () => {
    const aoFechar = renderizarPainel();

    fireEvent.click(screen.getByTitle('Fechar'));
    expect(aoFechar).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(aoFechar).toHaveBeenCalledTimes(2);

    fireEvent.click(screen.getByRole('button', { name: 'Fechar o painel' }));
    expect(aoFechar).toHaveBeenCalledTimes(3);
  });
});
