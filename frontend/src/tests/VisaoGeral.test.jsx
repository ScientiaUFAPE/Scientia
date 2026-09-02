import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { VisaoGeral } from '../paginas/VisaoGeral.jsx';
import * as editalService from '../servicos/editalService.js';
import * as publicacaoService from '../servicos/publicacaoService.js';
import * as relatorioService from '../servicos/relatorioService.js';
import * as vagaService from '../servicos/vagaService.js';

vi.mock('../servicos/editalService.js', () => ({ listar: vi.fn() }));
vi.mock('../servicos/publicacaoService.js', () => ({ listar: vi.fn() }));
vi.mock('../servicos/relatorioService.js', () => ({ obterIndicadoresProducoes: vi.fn() }));
vi.mock('../servicos/vagaService.js', () => ({ listar: vi.fn() }));

const INDICADORES = {
  totalProducoes: 4,
  porAno: [
    { ano: 2023, quantidade: 1 },
    { ano: 2024, quantidade: 2 },
    { ano: 2025, quantidade: 1 },
  ],
  porTipo: [
    { tipo: 'artigo', quantidade: 2 },
    { tipo: 'capitulo', quantidade: 1 },
    { tipo: 'resumo', quantidade: 1 },
  ],
  porArea: [
    { idArea: 1, nome: 'Ciência da Computação', quantidade: 3 },
    { idArea: 2, nome: 'Agronomia', quantidade: 1 },
  ],
  areasDestaque: [{ idArea: 1, nome: 'Ciência da Computação', quantidade: 3 }],
};

const RECENTES = {
  publicacoes: [
    {
      id: 1,
      titulo: 'Análise de desempenho de algoritmos de aprendizado',
      tipo: 'artigo',
      ano: 2025,
      areas: [{ id: 1, nome: 'Ciência da Computação' }],
    },
    {
      id: 2,
      titulo: 'Mapeamento de cultivares com visão computacional',
      tipo: 'resumo',
      ano: 2024,
      areas: [],
    },
  ],
};

const VAGAS = {
  vagas: [
    {
      id: 5,
      titulo: 'Bolsista de iniciação científica em visão computacional',
      qtdVagas: 2,
      projeto: { id: 3, titulo: 'Inteligência artificial aplicada ao Agreste' },
    },
  ],
  paginacao: { pagina: 1, porPagina: 5, total: 6 },
};

const EDITAIS = {
  editais: [
    { id: 7, nome: 'PIBIC/UFAPE 2026', ano: 2026, totalProjetos: 3 },
    { id: 8, nome: 'Edital Universal nº 03/2022', ano: 2022, totalProjetos: 1 },
  ],
};

const VINTE_E_QUATRO_AREAS = Array.from({ length: 24 }, (_, indice) => ({
  idArea: indice + 1,
  nome: `Área ${indice + 1}`,
  quantidade: 24 - indice,
}));

function renderizarTela() {
  return render(
    <MemoryRouter>
      <VisaoGeral anoAtual={2026} />
    </MemoryRouter>,
  );
}

function frase() {
  return screen.getByRole('heading', { level: 1 }).textContent;
}

describe('Visão geral', () => {
  beforeEach(() => {
    relatorioService.obterIndicadoresProducoes.mockResolvedValue({ indicadores: INDICADORES });
    publicacaoService.listar.mockResolvedValue(RECENTES);
    vagaService.listar.mockResolvedValue(VAGAS);
    editalService.listar.mockResolvedValue(EDITAIS);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('abre com a frase-síntese do acervo, do período e do que está em aberto', async () => {
    renderizarTela();
    expect(screen.getByText(/carregando a visão geral/i)).toBeInTheDocument();

    await act(async () => {});

    expect(relatorioService.obterIndicadoresProducoes).toHaveBeenCalledWith();
    expect(frase()).toBe(
      'São 4 produções científicas no acervo, cobrindo 2023–2025, com Ciência da Computação na ' +
        'liderança — e, agora, 6 vagas abertas e 1 edital de 2026.',
    );
  });

  it('com áreas empatadas, a frase liga os nomes com "e"', async () => {
    relatorioService.obterIndicadoresProducoes.mockResolvedValue({
      indicadores: {
        ...INDICADORES,
        porArea: [
          { idArea: 1, nome: 'Ciência da Computação', quantidade: 2 },
          { idArea: 2, nome: 'Agronomia', quantidade: 2 },
        ],
        areasDestaque: [
          { idArea: 1, nome: 'Ciência da Computação', quantidade: 2 },
          { idArea: 2, nome: 'Agronomia', quantidade: 2 },
        ],
      },
    });

    renderizarTela();
    await act(async () => {});

    expect(frase()).toContain('Ciência da Computação e Agronomia empatadas na liderança');
    expect(screen.getAllByText('destaque')).toHaveLength(2);
  });

  it('lista as áreas em ranking e os apoios por ano e por tipo', async () => {
    renderizarTela();
    await act(async () => {});

    const areas = screen.getByText('Áreas de pesquisa').closest('section');

    expect(within(areas).getByText('2 áreas · 4 produções')).toBeInTheDocument();
    expect(within(areas).getByText('Ciência da Computação')).toBeInTheDocument();
    expect(within(areas).getByText('Agronomia')).toBeInTheDocument();
    expect(screen.getByTitle('2024: 2')).toBeInTheDocument();
    expect(screen.getByText('Capítulo')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Relatórios completos' })).toHaveAttribute(
      'href',
      '/relatorios',
    );
  });

  it('mostra oito áreas e abre a lista inteira ao pedir todas', async () => {
    relatorioService.obterIndicadoresProducoes.mockResolvedValue({
      indicadores: {
        ...INDICADORES,
        porArea: VINTE_E_QUATRO_AREAS,
        areasDestaque: [VINTE_E_QUATRO_AREAS[0]],
      },
    });

    renderizarTela();
    await act(async () => {});

    const areas = screen.getByText('Áreas de pesquisa').closest('section');

    expect(areas.querySelectorAll('.rank')).toHaveLength(8);
    expect(within(areas).queryByText('Área 9')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Ver todas as 24 áreas' }));

    expect(areas.querySelectorAll('.rank')).toHaveLength(24);
    expect(within(areas).getByText('Área 24')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Mostrar menos' }));

    expect(areas.querySelectorAll('.rank')).toHaveLength(8);
  });

  it('resume a série por ano com o ano de pico', async () => {
    renderizarTela();
    await act(async () => {});

    expect(screen.getByText('Pico em 2024, com 2 registros.')).toBeInTheDocument();
  });

  it('mostra as cinco recentes com link para a publicação', async () => {
    renderizarTela();
    await act(async () => {});

    expect(publicacaoService.listar).toHaveBeenCalledWith({ pagina: 1, porPagina: 5 });
    expect(
      screen.getByRole('link', { name: 'Análise de desempenho de algoritmos de aprendizado' }),
    ).toHaveAttribute('href', '/publicacoes/1');
    expect(screen.getByText('Artigo · 2025 · Ciência da Computação')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver todas as publicações' })).toHaveAttribute(
      'href',
      '/publicacoes',
    );
  });

  it('em "Agora", traz as vagas abertas e só os editais do ano corrente', async () => {
    renderizarTela();
    await act(async () => {});

    expect(vagaService.listar).toHaveBeenCalledWith({
      status: 'aberta',
      pagina: 1,
      porPagina: 5,
    });

    const agora = screen.getByText('Agora').closest('section');

    expect(within(agora).getByText('6 vagas abertas · 1 edital de 2026')).toBeInTheDocument();
    expect(
      within(agora).getByText('Bolsista de iniciação científica em visão computacional'),
    ).toBeInTheDocument();
    expect(within(agora).getByText('2 vagas')).toBeInTheDocument();
    expect(within(agora).getByText('PIBIC/UFAPE 2026')).toBeInTheDocument();
    expect(within(agora).getByText('3 projetos')).toBeInTheDocument();
    expect(within(agora).queryByText('Edital Universal nº 03/2022')).not.toBeInTheDocument();
  });

  it('sem produções, troca a frase e esconde o ranking', async () => {
    relatorioService.obterIndicadoresProducoes.mockResolvedValue({
      indicadores: {
        totalProducoes: 0,
        porAno: [],
        porTipo: [],
        porArea: [],
        areasDestaque: [],
      },
    });
    publicacaoService.listar.mockResolvedValue({ publicacoes: [] });

    renderizarTela();
    await act(async () => {});

    expect(frase()).toMatch(/ainda não tem produções científicas cadastradas/);
    expect(screen.queryByText('Áreas de pesquisa')).not.toBeInTheDocument();
    expect(screen.getByText('Nenhuma publicação cadastrada ainda.')).toBeInTheDocument();
  });

  it('quando os indicadores falham, mostra o alerta sem derrubar o resto da página', async () => {
    relatorioService.obterIndicadoresProducoes.mockRejectedValue(
      new Error('Não foi possível carregar os indicadores.'),
    );

    renderizarTela();
    await act(async () => {});

    expect(screen.getByText('Não foi possível carregar os indicadores.')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Análise de desempenho de algoritmos de aprendizado' }),
    ).toBeInTheDocument();
  });
});
