import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Projetos } from '../paginas/Projetos.jsx';
import * as areaService from '../servicos/areaService.js';
import * as grupoService from '../servicos/grupoService.js';
import * as projetoService from '../servicos/projetoService.js';
import * as vagaService from '../servicos/vagaService.js';
import { RESPOSTA_GRUPOS, RESPOSTA_PROJETO, RESPOSTA_PROJETOS } from './fixturesAcervo.js';

vi.mock('../servicos/projetoService.js', () => ({
  listar: vi.fn(),
  buscarPorId: vi.fn(),
}));

vi.mock('../servicos/grupoService.js', () => ({
  listar: vi.fn(),
  buscarPorId: vi.fn(),
}));

vi.mock('../servicos/areaService.js', () => ({ listar: vi.fn() }));

vi.mock('../servicos/vagaService.js', () => ({ listar: vi.fn() }));

const sessaoFalsa = { usuario: null };

vi.mock('../contexto/AuthContext.jsx', () => ({
  useAuth: () => sessaoFalsa,
}));

function renderizarTela() {
  return render(
    <MemoryRouter>
      <Projetos />
    </MemoryRouter>,
  );
}

describe('Tela de projetos de pesquisa', () => {
  beforeEach(() => {
    sessaoFalsa.usuario = null;
    vi.useFakeTimers();
    projetoService.listar.mockResolvedValue(RESPOSTA_PROJETOS);
    projetoService.buscarPorId.mockResolvedValue(RESPOSTA_PROJETO);
    grupoService.listar.mockResolvedValue(RESPOSTA_GRUPOS);
    areaService.listar.mockResolvedValue({ areas: [{ id: 1, nome: 'Ciência da Computação' }] });
    vagaService.listar.mockResolvedValue({ vagas: [], paginacao: { pagina: 1, porPagina: 1, total: 2 } });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('agrupa o projeto por situação e mostra área, grupo, período e publicações', async () => {
    renderizarTela();
    expect(screen.getByText(/carregando projetos/i)).toBeInTheDocument();

    await act(async () => {});

    const cartao = screen
      .getByRole('link', { name: 'Inteligência artificial aplicada ao Agreste' })
      .closest('li');

    expect(screen.getByRole('heading', { name: 'Em andamento' })).toBeInTheDocument();
    expect(within(cartao).getByText('4 publicações')).toBeInTheDocument();
    expect(within(cartao).getByText('desde 03/2024')).toBeInTheDocument();
    expect(within(cartao).getByText('CC')).toBeInTheDocument();
    expect(
      within(cartao).getByRole('link', { name: 'Grupo de Pesquisa em Computação Aplicada' }),
    ).toHaveAttribute('href', '/grupos/2');
    expect(
      within(cartao).getByRole('link', { name: 'Inteligência artificial aplicada ao Agreste' }),
    ).toHaveAttribute('href', '/projetos/3');
  });

  it('escolher uma situação chama o serviço com o filtro de status', async () => {
    renderizarTela();
    await act(async () => {});

    fireEvent.click(screen.getByRole('button', { name: /concluídos 36/i }));
    await act(async () => {});

    expect(projetoService.listar).toHaveBeenLastCalledWith({
      busca: '',
      status: 'concluido',
      idGrupo: '',
      idArea: '',
      pagina: 1,
      porPagina: 20,
    });
  });

  it('avançar a paginação pede a página seguinte ao serviço', async () => {
    renderizarTela();
    await act(async () => {});

    expect(screen.getByText(/página 1 de 6 · 120 resultados/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /próxima/i }));
    await act(async () => {});

    expect(projetoService.listar).toHaveBeenLastCalledWith({
      busca: '',
      status: '',
      idGrupo: '',
      idArea: '',
      pagina: 2,
      porPagina: 20,
    });
  });

  it('carrega os grupos de pesquisa no select buscando até 100 por página', async () => {
    renderizarTela();
    await act(async () => {});

    expect(grupoService.listar).toHaveBeenCalledWith({ porPagina: 100 });

    const grupo = RESPOSTA_GRUPOS.grupos[0];

    expect(
      within(screen.getByLabelText('Grupo')).getByRole('option', {
        name: grupo.nome,
      }),
    ).toBeInTheDocument();
  });

  it('escolher um grupo chama o serviço com idGrupo e volta para a página 1', async () => {
    renderizarTela();
    await act(async () => {});

    fireEvent.click(screen.getByRole('button', { name: /próxima/i }));
    await act(async () => {});

    const grupo = RESPOSTA_GRUPOS.grupos[0];

    fireEvent.change(screen.getByLabelText('Grupo'), {
      target: { value: String(grupo.id) },
    });
    await act(async () => {});

    expect(projetoService.listar).toHaveBeenLastCalledWith({
      busca: '',
      status: '',
      idGrupo: String(grupo.id),
      idArea: '',
      pagina: 1,
      porPagina: 20,
    });
  });

  it('abre o painel rápido com detalhes e saídas do projeto', async () => {
    renderizarTela();
    await act(async () => {});

    fireEvent.click(screen.getByRole('button', { name: /inteligência artificial aplicada ao agreste/i }));
    await act(async () => {});

    expect(projetoService.buscarPorId).toHaveBeenCalledWith(3);
    expect(screen.getByText('Estuda a aplicação de aprendizado de máquina...')).toBeInTheDocument();
    expect(screen.getByText('Ana Souza')).toBeInTheDocument();
    expect(screen.getByText('2 vagas abertas')).toBeInTheDocument();
  });

  it('sem sessão ou com conta de aluno, não oferece o atalho de cadastro', async () => {
    renderizarTela();
    await act(async () => {});

    expect(screen.queryByRole('link', { name: /cadastrar projeto/i })).not.toBeInTheDocument();

    sessaoFalsa.usuario = { id: 152, nome: 'Ana Souza', tipo: 'aluno' };
    renderizarTela();
    await act(async () => {});

    expect(screen.queryByRole('link', { name: /cadastrar projeto/i })).not.toBeInTheDocument();
  });

  it.each(['pesquisador', 'admin'])('a conta %s ganha o atalho de cadastro', async (tipo) => {
    sessaoFalsa.usuario = { id: 7, nome: 'Ana Souza', tipo };

    renderizarTela();
    await act(async () => {});

    expect(screen.getByRole('link', { name: /cadastrar projeto/i })).toHaveAttribute(
      'href',
      '/projetos/cadastro',
    );
  });
});
