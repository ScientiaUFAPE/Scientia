import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Vagas } from '../paginas/Vagas.jsx';
import * as projetoService from '../servicos/projetoService.js';
import * as vagaService from '../servicos/vagaService.js';

vi.mock('../servicos/vagaService.js', () => ({
  listar: vi.fn(),
  excluir: vi.fn(),
}));

vi.mock('../servicos/projetoService.js', () => ({
  listar: vi.fn(),
}));

const sessaoFalsa = { usuario: null, token: null };

vi.mock('../contexto/AuthContext.jsx', () => ({
  useAuth: () => sessaoFalsa,
}));

const resposta = {
  vagas: [
    {
      id: 5,
      titulo: 'Vaga de iniciação científica',
      requisitos: 'Python básico.',
      status: 'aberta',
      qtdVagas: 2,
      dataAbertura: '2026-08-23',
      projeto: { id: 3, titulo: 'Projeto de IA' },
      area: { id: 1, nome: 'Ciência da Computação' },
      totalCandidaturas: 4,
    },
  ],
  paginacao: { pagina: 1, porPagina: 20, total: 1 },
  resumo: { totalVagas: 1, abertas: 1, primeiroAno: 2026, totalCandidaturas: 4 },
};

function renderizar() {
  return render(
    <MemoryRouter>
      <Vagas />
    </MemoryRouter>,
  );
}

describe('Tela de vagas', () => {
  beforeEach(() => {
    sessaoFalsa.usuario = null;
    sessaoFalsa.token = null;
    vagaService.listar.mockResolvedValue(resposta);
    vagaService.excluir.mockResolvedValue({});
    projetoService.listar.mockResolvedValue({ projetos: [{ id: 3, titulo: 'Projeto de IA' }] });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it('mostra vaga, projeto e quantidade de candidaturas para visitante', async () => {
    renderizar();
    await act(async () => {});

    expect(screen.getByText('Vaga de iniciação científica')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Projeto de IA' })).toHaveAttribute(
      'href',
      '/projetos/3',
    );
    expect(screen.getAllByText(/4 candidaturas/i)).not.toHaveLength(0);
    expect(screen.getByRole('link', { name: 'Candidatar-se' })).toHaveAttribute('href', '/login');
    expect(screen.queryByRole('link', { name: /cadastrar vaga/i })).not.toBeInTheDocument();
  });

  it('aplica o filtro de situação no serviço', async () => {
    renderizar();
    await act(async () => {});

    fireEvent.click(screen.getByRole('button', { name: /Fechadas\s*0/ }));
    await act(async () => {});

    expect(vagaService.listar).toHaveBeenLastCalledWith({
      busca: '',
      status: 'fechada',
      idProjeto: '',
      pagina: 1,
      porPagina: 20,
    });
  });

  it('pesquisador pode editar e excluir uma vaga após confirmação', async () => {
    sessaoFalsa.usuario = { id: 4, nome: 'Pesquisador', tipo: 'pesquisador' };
    sessaoFalsa.token = 'token-teste';
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    renderizar();
    await act(async () => {});

    expect(screen.getByRole('link', { name: /cadastrar vaga/i })).toHaveAttribute(
      'href',
      '/vagas/cadastro',
    );
    expect(screen.getByRole('link', { name: 'Editar' })).toHaveAttribute('href', '/vagas/5/editar');

    fireEvent.click(screen.getByRole('button', { name: 'Excluir' }));
    await act(async () => {});

    expect(vagaService.excluir).toHaveBeenCalledWith(5, 'token-teste');
    expect(screen.queryByText('Vaga de iniciação científica')).not.toBeInTheDocument();
  });
});
