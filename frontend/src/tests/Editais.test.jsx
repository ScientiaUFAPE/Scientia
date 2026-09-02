import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Editais } from '../paginas/Editais.jsx';
import * as editalService from '../servicos/editalService.js';
import { RESPOSTA_EDITAIS } from './fixturesAcervo.js';

vi.mock('../servicos/editalService.js', () => ({
  listar: vi.fn(),
}));

function renderizar() {
  return render(
    <MemoryRouter>
      <Editais />
    </MemoryRouter>,
  );
}

describe('Tela de editais', () => {
  beforeEach(() => {
    editalService.listar.mockResolvedValue(RESPOSTA_EDITAIS);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('pede os projetos junto e mostra ano, grupos e total de cada edital', async () => {
    renderizar();
    await act(async () => {});

    expect(editalService.listar).toHaveBeenCalledWith({ comProjetos: 1 });

    const linha = screen.getByText('Edital Universal nº 03/2022').closest('button');

    expect(within(linha).getByText('2022')).toBeInTheDocument();
    expect(
      within(linha).getByText('Grupo de Pesquisa em Computação Aplicada +1'),
    ).toBeInTheDocument();
    expect(within(linha).getByText('2 projetos')).toBeInTheDocument();

    const outra = screen.getByText('Edital PIBIC 2026').closest('button');

    expect(within(outra).getByText('Grupo de Pesquisa em Computação Aplicada')).toBeInTheDocument();
    expect(within(outra).getByText('1 projeto')).toBeInTheDocument();
  });

  it('o filtro de ano deixa na lista só os editais daquele ano', async () => {
    renderizar();
    await act(async () => {});

    fireEvent.change(screen.getByLabelText('Ano'), { target: { value: '2026' } });

    expect(screen.getByText('Edital PIBIC 2026')).toBeInTheDocument();
    expect(screen.queryByText('Edital Universal nº 03/2022')).not.toBeInTheDocument();
  });

  it('a linha abre o painel com os projetos e sem página completa', async () => {
    renderizar();
    await act(async () => {});

    fireEvent.click(screen.getByText('Edital Universal nº 03/2022'));

    const painel = screen.getByRole('complementary');

    expect(within(painel).getByText('Edital · 2022')).toBeInTheDocument();
    expect(within(painel).getByText('Núcleo de Redes')).toBeInTheDocument();
    expect(
      within(painel).getByRole('link', { name: 'Inteligência artificial aplicada ao Agreste' }),
    ).toHaveAttribute('href', '/projetos/3');
    expect(within(painel).getByText('Em andamento')).toBeInTheDocument();
    expect(
      within(painel).queryByRole('link', { name: 'Abrir página completa' }),
    ).not.toBeInTheDocument();
  });
});
