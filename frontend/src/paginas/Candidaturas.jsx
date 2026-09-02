import { useEffect, useState } from 'react';

import { Paginacao } from '../componentes/Paginacao.jsx';
import { useAuth } from '../contexto/AuthContext.jsx';
import * as candidaturaService from '../servicos/candidaturaService.js';
import * as vagaService from '../servicos/vagaService.js';
import { formatarData, POR_PAGINA } from '../utils/acervo.js';

const ROTULOS_STATUS = {
  pendente: 'Pendente',
  aprovada: 'Aprovada',
  rejeitada: 'Rejeitada',
};

export function Candidaturas() {
  const { usuario, token } = useAuth();
  const [candidaturas, setCandidaturas] = useState([]);
  const [vagas, setVagas] = useState([]);
  const [paginacao, setPaginacao] = useState(null);
  const [pagina, setPagina] = useState(1);
  const [idVaga, setIdVaga] = useState(() => new URLSearchParams(window.location.search).get('vaga') ?? '');
  const [idAlunoAdmin, setIdAlunoAdmin] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let atual = true;
    setCarregando(true);
    setErro('');

    candidaturaService
      .listar({ pagina, porPagina: POR_PAGINA }, token)
      .then((dados) => {
        if (!atual) {
          return;
        }
        setCandidaturas(dados.candidaturas);
        setPaginacao(dados.paginacao);
      })
      .catch((falha) => atual && setErro(falha.message))
      .finally(() => atual && setCarregando(false));

    return () => {
      atual = false;
    };
  }, [pagina, token]);

  useEffect(() => {
    let atual = true;

    vagaService
      .listar({ status: 'aberta', porPagina: 100 })
      .then((dados) => atual && setVagas(dados.vagas))
      .catch(() => {});

    return () => {
      atual = false;
    };
  }, []);

  async function recarregar() {
    setErro('');

    try {
      const dados = await candidaturaService.listar({ pagina, porPagina: POR_PAGINA }, token);
      setCandidaturas(dados.candidaturas);
      setPaginacao(dados.paginacao);
    } catch (falha) {
      setErro(falha.message);
    }
  }

  async function candidatar(evento) {
    evento.preventDefault();

    const corpo = {
      idVaga: Number(idVaga),
      ...(usuario.tipo === 'admin' ? { idAluno: Number(idAlunoAdmin) } : {}),
    };

    try {
      await candidaturaService.cadastrar(corpo, token);
      setIdVaga('');
      setIdAlunoAdmin('');
      await recarregar();
    } catch (falha) {
      setErro(falha.message);
    }
  }

  async function mudarStatus(candidatura, status) {
    try {
      await candidaturaService.atualizar(
        candidatura.aluno.id,
        candidatura.vaga.id,
        { status },
        token,
      );
      await recarregar();
    } catch (falha) {
      setErro(falha.message);
    }
  }

  async function excluir(candidatura) {
    if (!window.confirm('Excluir esta candidatura?')) {
      return;
    }

    try {
      await candidaturaService.excluir(candidatura.aluno.id, candidatura.vaga.id, token);
      await recarregar();
    } catch (falha) {
      setErro(falha.message);
    }
  }

  const podeCriar = usuario.tipo === 'aluno' || usuario.tipo === 'admin';
  const podeAtualizar = usuario.tipo === 'pesquisador' || usuario.tipo === 'admin';
  const podeExcluir = usuario.tipo === 'aluno' || usuario.tipo === 'admin';

  return (
    <section>
      <h1 className="pagina__titulo">Candidaturas</h1>
      <p className="pagina__descricao">Acompanhe inscrições nas vagas de pesquisa.</p>
      {erro && <p className="alerta alerta--erro">{erro}</p>}

      {podeCriar && (
        <form className="formulario-acervo formulario-acervo--compacto" onSubmit={candidatar}>
          {usuario.tipo === 'admin' && (
            <label className="campo">
              <span>ID do aluno</span>
              <input
                type="number"
                min="1"
                value={idAlunoAdmin}
                onChange={(evento) => setIdAlunoAdmin(evento.target.value)}
              />
            </label>
          )}

          <label className="campo">
            <span>Vaga aberta</span>
            <select value={idVaga} onChange={(evento) => setIdVaga(evento.target.value)}>
              <option value="">Selecione</option>
              {vagas.map((vaga) => (
                <option key={vaga.id} value={vaga.id}>
                  {vaga.titulo} — {vaga.projeto.titulo}
                </option>
              ))}
            </select>
          </label>

          <button
            type="submit"
            className="botao botao--primario botao--compacto"
            disabled={!idVaga || (usuario.tipo === 'admin' && !idAlunoAdmin)}
          >
            Cadastrar candidatura
          </button>
        </form>
      )}

      {carregando && <p className="aviso-carregando">Carregando candidaturas...</p>}

      {!carregando && candidaturas.length > 0 && (
        <div className="tabela-responsiva">
          <table className="tabela-relatorio">
            <thead>
              <tr>
                <th>Aluno</th>
                <th>Vaga</th>
                <th>Projeto</th>
                <th>Status</th>
                <th>Data</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {candidaturas.map((candidatura) => (
                <tr key={`${candidatura.aluno.id}-${candidatura.vaga.id}`}>
                  <td>
                    {candidatura.aluno.nome}
                    <small>{candidatura.aluno.matricula}</small>
                  </td>
                  <td>{candidatura.vaga.titulo}</td>
                  <td>{candidatura.vaga.projeto.titulo}</td>
                  <td>{ROTULOS_STATUS[candidatura.status] ?? candidatura.status}</td>
                  <td>{formatarData(candidatura.dataCandidatura)}</td>
                  <td>
                    <div className="acoes-registro">
                      {podeAtualizar && (
                        <>
                          <button
                            type="button"
                            className="botao botao--discreto"
                            onClick={() => mudarStatus(candidatura, 'aprovada')}
                          >
                            Aprovar
                          </button>
                          <button
                            type="button"
                            className="botao botao--discreto"
                            onClick={() => mudarStatus(candidatura, 'rejeitada')}
                          >
                            Rejeitar
                          </button>
                        </>
                      )}
                      {podeExcluir && (
                        <button
                          type="button"
                          className="botao botao--discreto"
                          onClick={() => excluir(candidatura)}
                        >
                          Excluir
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!carregando && candidaturas.length === 0 && (
        <div className="aviso-central">
          <p>Nenhuma candidatura encontrada.</p>
        </div>
      )}

      {!carregando && <Paginacao paginacao={paginacao} aoTrocarPagina={setPagina} />}
    </section>
  );
}
