import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { App } from '../App.jsx';
import * as areaService from '../servicos/areaService.js';
import * as editalService from '../servicos/editalService.js';
import * as grupoService from '../servicos/grupoService.js';
import * as pesquisadorService from '../servicos/pesquisadorService.js';
import * as projetoService from '../servicos/projetoService.js';
import * as relatorioService from '../servicos/relatorioService.js';
import {
  RESPOSTA_AREAS,
  RESPOSTA_EDITAIS,
  RESPOSTA_GRUPOS,
  RESPOSTA_PESQUISADORES,
  RESPOSTA_PROJETOS,
} from './fixturesAcervo.js';

vi.mock('../servicos/areaService.js', () => ({ listar: vi.fn() }));
vi.mock('../servicos/editalService.js', () => ({ listar: vi.fn() }));
vi.mock('../servicos/grupoService.js', () => ({ listar: vi.fn() }));
vi.mock('../servicos/pesquisadorService.js', () => ({ listar: vi.fn() }));
vi.mock('../servicos/projetoService.js', () => ({ listar: vi.fn() }));
vi.mock('../servicos/relatorioService.js', () => ({ obterIndicadoresProducoes: vi.fn() }));

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
    relatorioService.obterIndicadoresProducoes.mockResolvedValue({
      indicadores: {
        totalProducoes: 0,
        porAno: [],
        porTipo: [],
        porArea: [],
        areasDestaque: [],
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

  it('rota de indicadores redireciona visitante sem sessão para o login', async () => {
    renderizarApp('/indicadores');
    await act(async () => {});

    expect(screen.getByRole('heading', { name: 'Entrar' })).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Indicadores de produções científicas' }),
    ).not.toBeInTheDocument();
  });

  it('rota de indicadores fica disponível para usuário autenticado', async () => {
    sessaoFalsa.usuario = ALUNO;
    sessaoFalsa.token = 'token-aluno';

    renderizarApp('/indicadores');
    await act(async () => {});

    expect(
      screen.getByRole('heading', { name: 'Indicadores de produções científicas' }),
    ).toBeInTheDocument();
    expect(relatorioService.obterIndicadoresProducoes).toHaveBeenCalledWith('token-aluno');
  });
});
