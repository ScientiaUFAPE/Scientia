import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { App } from '../App.jsx';
import * as areaService from '../servicos/areaService.js';
import * as editalService from '../servicos/editalService.js';
import * as grupoService from '../servicos/grupoService.js';
import * as pesquisadorService from '../servicos/pesquisadorService.js';
import * as projetoService from '../servicos/projetoService.js';
import * as publicacaoService from '../servicos/publicacaoService.js';
import * as relatorioService from '../servicos/relatorioService.js';
import * as vagaService from '../servicos/vagaService.js';
import {
  RESPOSTA_AREAS,
  RESPOSTA_EDITAIS,
  RESPOSTA_GRUPOS,
  RESPOSTA_PESQUISADORES,
  RESPOSTA_PROJETOS,
  RESPOSTA_PUBLICACOES,
} from './fixturesAcervo.js';

vi.mock('../servicos/areaService.js', () => ({ listar: vi.fn() }));
vi.mock('../servicos/editalService.js', () => ({ listar: vi.fn() }));
vi.mock('../servicos/grupoService.js', () => ({ listar: vi.fn() }));
vi.mock('../servicos/pesquisadorService.js', () => ({ listar: vi.fn() }));
vi.mock('../servicos/publicacaoService.js', () => ({ listar: vi.fn() }));
vi.mock('../servicos/projetoService.js', () => ({ listar: vi.fn() }));
vi.mock('../servicos/relatorioService.js', () => ({ obterIndicadoresProducoes: vi.fn() }));
vi.mock('../servicos/vagaService.js', () => ({ listar: vi.fn() }));

const sessaoFalsa = { usuario: null, token: null, carregando: false, entrar: vi.fn() };

vi.mock('../contexto/AuthContext.jsx', () => ({
  useAuth: () => sessaoFalsa,
}));

const ALUNO = {
  id: 1,
  nome: 'Fulano de Tal',
  email: 'fulano@ufape.edu.br',
  tipo: 'aluno',
  criadoEm: '2026-08-19T12:00:00.000Z',
};

const PESQUISADOR = {
  id: 2,
  nome: 'Beltrana Silva',
  email: 'beltrana@ufape.edu.br',
  tipo: 'pesquisador',
  criadoEm: '2026-08-19T12:00:00.000Z',
};

function renderizarApp(caminho) {
  return render(
    <MemoryRouter initialEntries={[caminho]}>
      <App />
    </MemoryRouter>,
  );
}

describe('Guarda das rotas de cadastro no App', () => {
  beforeEach(() => {
    areaService.listar.mockResolvedValue(RESPOSTA_AREAS);
    editalService.listar.mockResolvedValue(RESPOSTA_EDITAIS);
    grupoService.listar.mockResolvedValue(RESPOSTA_GRUPOS);
    pesquisadorService.listar.mockResolvedValue(RESPOSTA_PESQUISADORES);
    projetoService.listar.mockResolvedValue(RESPOSTA_PROJETOS);
    publicacaoService.listar.mockResolvedValue(RESPOSTA_PUBLICACOES);
    vagaService.listar.mockResolvedValue({ vagas: [], paginacao: { total: 0 } });
    relatorioService.obterIndicadoresProducoes.mockResolvedValue({
      indicadores: {
        totalProducoes: 4,
        porAno: [{ ano: 2024, quantidade: 4 }],
        porTipo: [{ tipo: 'artigo', quantidade: 4 }],
        porArea: [{ idArea: 1, nome: 'Ciência da Computação', quantidade: 4 }],
        areasDestaque: [{ idArea: 1, nome: 'Ciência da Computação', quantidade: 4 }],
      },
    });
  });

  afterEach(() => {
    sessaoFalsa.usuario = null;
    sessaoFalsa.token = null;
    vi.clearAllMocks();
  });

  it.each([
    ['/publicacoes/cadastro', 'Cadastrar publicação'],
    ['/projetos/cadastro', 'Cadastrar projeto'],
  ])('sessão de aluno em %s não abre o formulário, leva ao acesso negado', async (caminho, titulo) => {
    sessaoFalsa.usuario = ALUNO;

    renderizarApp(caminho);
    await act(async () => {});

    expect(screen.queryByRole('heading', { name: titulo })).not.toBeInTheDocument();
    expect(screen.getByText(/acesso negado/i)).toBeInTheDocument();
  });

  it.each([
    ['/publicacoes/cadastro', 'Cadastrar publicação'],
    ['/projetos/cadastro', 'Cadastrar projeto'],
  ])('sessão de pesquisador em %s abre o formulário', async (caminho, titulo) => {
    sessaoFalsa.usuario = PESQUISADOR;

    renderizarApp(caminho);
    await act(async () => {});

    expect(screen.getByRole('heading', { name: titulo })).toBeInTheDocument();
  });

  it('visitante sem sessão em / vê a frase-síntese da visão geral', async () => {
    renderizarApp('/');
    await act(async () => {});

    expect(screen.getByRole('heading', { level: 1 }).textContent).toMatch(
      /São 4 produções científicas no acervo/,
    );
  });

  it('a antiga rota de indicadores redireciona para a visão geral', async () => {
    renderizarApp('/indicadores');
    await act(async () => {});

    expect(screen.getByRole('heading', { level: 1 }).textContent).toMatch(
      /São 4 produções científicas no acervo/,
    );
    expect(screen.queryByRole('heading', { name: 'Entrar' })).not.toBeInTheDocument();
  });
});
