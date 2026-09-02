import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Pesquisadores } from '../paginas/Pesquisadores.jsx';
import * as pesquisadorService from '../servicos/pesquisadorService.js';
import { RESPOSTA_PESQUISADORES } from './fixturesAcervo.js';

vi.mock('../servicos/pesquisadorService.js', () => ({
  listar: vi.fn(),
}));

function renderizar() {
  return render(
    <MemoryRouter>
      <Pesquisadores />
    </MemoryRouter>,
  );
}

describe('Tela de pesquisadores', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    pesquisadorService.listar.mockResolvedValue(RESPOSTA_PESQUISADORES);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('lista cada pesquisador com iniciais, vínculo e total de publicações', async () => {
    renderizar();
    await act(async () => {});

    expect(pesquisadorService.listar).toHaveBeenLastCalledWith({
      busca: '',
      vinculo: '',
      pagina: 1,
      porPagina: 20,
    });

    const linha = screen.getByText('Ana Souza').closest('button');

    expect(within(linha).getByText('AS')).toBeInTheDocument();
    expect(within(linha).getByText('Docente')).toBeInTheDocument();
    expect(within(linha).getByText('12 publicações')).toBeInTheDocument();

    const outra = screen.getByText('Bruno Lima').closest('button');

    expect(within(outra).getByText('Discente')).toBeInTheDocument();
    expect(within(outra).getByText('3 publicações')).toBeInTheDocument();
  });

  it('o filtro de vínculo volta para a primeira página e chega no serviço', async () => {
    renderizar();
    await act(async () => {});

    fireEvent.change(screen.getByLabelText('Vínculo'), { target: { value: 'discente' } });
    await act(async () => {});

    expect(pesquisadorService.listar).toHaveBeenLastCalledWith({
      busca: '',
      vinculo: 'discente',
      pagina: 1,
      porPagina: 20,
    });
  });

  it('a linha abre o painel com o Lattes e o caminho do perfil', async () => {
    renderizar();
    await act(async () => {});

    fireEvent.click(screen.getByText('Ana Souza'));

    const painel = screen.getByRole('complementary');

    expect(within(painel).getByRole('heading', { name: 'Ana Souza' })).toBeInTheDocument();
    expect(within(painel).getByRole('link', { name: '1234567890123456' })).toHaveAttribute(
      'href',
      'http://lattes.cnpq.br/1234567890123456',
    );
    expect(within(painel).getByRole('link', { name: 'Abrir página completa' })).toHaveAttribute(
      'href',
      '/pesquisadores/91',
    );
  });
});
