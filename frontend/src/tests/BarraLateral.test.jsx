import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BarraLateral } from '../componentes/BarraLateral.jsx';

const sessaoFalsa = { usuario: null, sair: vi.fn() };

vi.mock('../contexto/AuthContext.jsx', () => ({
  useAuth: () => sessaoFalsa,
}));

function renderizarBarra() {
  return render(
    <MemoryRouter>
      <BarraLateral />
    </MemoryRouter>,
  );
}

describe('Barra lateral do hub', () => {
  beforeEach(() => {
    sessaoFalsa.usuario = null;
  });

  it('sem sessão, mostra os grupos de navegação e o convite para entrar', () => {
    renderizarBarra();

    expect(screen.getByRole('link', { name: 'Visão geral' })).toHaveAttribute('href', '/');

    expect(screen.getByText('Explorar')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Publicações' })).toHaveAttribute(
      'href',
      '/publicacoes',
    );
    expect(screen.getByRole('link', { name: 'Projetos' })).toHaveAttribute('href', '/projetos');
    expect(screen.getByRole('link', { name: 'Grupos' })).toHaveAttribute('href', '/grupos');
    expect(screen.getByRole('link', { name: 'Pesquisadores' })).toHaveAttribute(
      'href',
      '/pesquisadores',
    );

    expect(screen.getByText('Participar')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Vagas' })).toHaveAttribute('href', '/vagas');
    expect(screen.getByRole('link', { name: 'Editais' })).toHaveAttribute('href', '/editais');

    expect(screen.queryByRole('link', { name: 'Minhas candidaturas' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Usuários' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /sair/i })).not.toBeInTheDocument();

    expect(screen.getByRole('link', { name: 'Entrar' })).toHaveAttribute('href', '/login');
    expect(screen.getByRole('link', { name: 'Cadastrar' })).toHaveAttribute('href', '/cadastro');
  });

  it('com sessão de aluno, o rodapé leva à conta e guarda as candidaturas', () => {
    sessaoFalsa.usuario = { id: 2, nome: 'Bruno Lima', email: 'bruno@ufape.edu.br', tipo: 'aluno' };

    renderizarBarra();

    expect(screen.getByRole('link', { name: 'Minhas candidaturas' })).toHaveAttribute(
      'href',
      '/candidaturas',
    );
    expect(screen.getByRole('link', { name: /Bruno Lima/ })).toHaveAttribute('href', '/conta');
    expect(screen.getByRole('button', { name: /sair/i })).toBeInTheDocument();

    expect(screen.queryByRole('link', { name: 'Usuários' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Entrar' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Cadastrar' })).not.toBeInTheDocument();
  });

  it('com sessão de admin, o rodapé ganha o link de usuários', () => {
    sessaoFalsa.usuario = { id: 1, nome: 'Ana Souza', email: 'ana@ufape.edu.br', tipo: 'admin' };

    renderizarBarra();

    expect(screen.getByRole('link', { name: 'Usuários' })).toHaveAttribute('href', '/usuarios');
    expect(screen.getByRole('link', { name: /Ana Souza/ })).toHaveAttribute('href', '/conta');
  });

  it.each(['pesquisador', 'admin'])('a conta %s ganha o atalho de cadastro no acervo', (tipo) => {
    sessaoFalsa.usuario = { id: 7, nome: 'Ana Souza', email: 'ana@ufape.edu.br', tipo };

    renderizarBarra();

    expect(screen.getByRole('link', { name: 'Cadastrar' })).toHaveAttribute(
      'href',
      '/publicacoes/cadastro',
    );
  });

  it('conta de aluno não recebe o atalho de cadastro nem o convite para entrar', () => {
    sessaoFalsa.usuario = { id: 2, nome: 'Bruno Lima', email: 'bruno@ufape.edu.br', tipo: 'aluno' };

    renderizarBarra();

    expect(screen.queryByRole('link', { name: 'Cadastrar' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Entrar' })).not.toBeInTheDocument();
  });
});
