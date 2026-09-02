import { act, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DetalheGrupo } from '../paginas/DetalheGrupo.jsx';
import { Grupos } from '../paginas/Grupos.jsx';
import * as grupoService from '../servicos/grupoService.js';
import { RESPOSTA_GRUPO, RESPOSTA_GRUPOS } from './fixturesAcervo.js';

vi.mock('../servicos/grupoService.js', () => ({
  listar: vi.fn(),
  buscarPorId: vi.fn(),
}));

vi.mock('../contexto/AuthContext.jsx', () => ({
  useAuth: () => ({ usuario: null, token: null }),
}));

describe('Tela de grupos de pesquisa', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    grupoService.listar.mockResolvedValue(RESPOSTA_GRUPOS);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('mostra o cartão do grupo com ano, totais e link do diretório', async () => {
    render(
      <MemoryRouter>
        <Grupos />
      </MemoryRouter>,
    );
    await act(async () => {});

    expect(grupoService.listar).toHaveBeenLastCalledWith({
      busca: '',
      ordem: 'projetos',
      pagina: 1,
      porPagina: 20,
    });

    const cartao = screen
      .getByRole('link', { name: 'Grupo de Pesquisa em Computação Aplicada' })
      .closest('li');

    expect(within(cartao).getByText(/Desde 2015 · liderado por Ana Souza/)).toBeInTheDocument();
    expect(within(cartao).getByText('6 projetos')).toBeInTheDocument();
    expect(within(cartao).getByText('5')).toBeInTheDocument();
    expect(
      within(cartao).getByRole('link', { name: /diretório de grupos/i }),
    ).toHaveAttribute('href', 'http://dgp.cnpq.br/exemplo');
  });
});

describe('Detalhe do grupo de pesquisa', () => {
  beforeEach(() => {
    grupoService.buscarPorId.mockResolvedValue(RESPOSTA_GRUPO);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('mostra os membros com o papel e os projetos do grupo', async () => {
    render(
      <MemoryRouter initialEntries={['/grupos/2']}>
        <Routes>
          <Route path="/grupos/:id" element={<DetalheGrupo />} />
        </Routes>
      </MemoryRouter>,
    );
    await act(async () => {});

    expect(grupoService.buscarPorId).toHaveBeenCalledWith('2');
    expect(screen.getByText('Ana Souza')).toBeInTheDocument();
    expect(screen.getByText('Líder')).toBeInTheDocument();
    expect(screen.getByText(/grupo sem perfil no diretório de grupos/i)).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Inteligência artificial aplicada ao Agreste' }),
    ).toHaveAttribute('href', '/projetos/3');
  });
});
