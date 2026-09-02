import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { Paginacao } from '../componentes/Paginacao.jsx';
import { useAuth } from '../contexto/AuthContext.jsx';
import * as grupoService from '../servicos/grupoService.js';
import * as projetoService from '../servicos/projetoService.js';
import {
  podeCadastrarNoAcervo,
  POR_PAGINA,
  ROTULOS_STATUS,
  siglaDaArea,
} from '../utils/acervo.js';

export function Projetos() {
  const { usuario, token } = useAuth();

  const [projetos, setProjetos] = useState([]);
  const [paginacao, setPaginacao] = useState(null);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(true);

  const [grupos, setGrupos] = useState([]);

  const [busca, setBusca] = useState('');
  const [status, setStatus] = useState('');
  const [idGrupo, setIdGrupo] = useState('');
  const [pagina, setPagina] = useState(1);

  const [buscaAplicada, setBuscaAplicada] = useState('');

  useEffect(() => {
    let atual = true;

    grupoService
      .listar({ porPagina: 100 })
      .then((dados) => atual && setGrupos(dados.grupos))
      .catch(() => {});

    return () => {
      atual = false;
    };
  }, []);

  useEffect(() => {
    const temporizador = setTimeout(() => {
      setBuscaAplicada(busca);
      setPagina(1);
    }, 400);

    return () => clearTimeout(temporizador);
  }, [busca]);

  useEffect(() => {
    let atual = true;
    setCarregando(true);
    setErro('');

    projetoService
      .listar({ busca: buscaAplicada, status, idGrupo, pagina, porPagina: POR_PAGINA })
      .then((dados) => {
        if (!atual) {
          return;
        }
        setProjetos(dados.projetos);
        setPaginacao(dados.paginacao);
      })
      .catch((falha) => atual && setErro(falha.message))
      .finally(() => atual && setCarregando(false));

    return () => {
      atual = false;
    };
  }, [buscaAplicada, status, idGrupo, pagina]);

  const filtrosAtivos = Boolean(buscaAplicada.trim() || status || idGrupo);

  function trocarStatus(evento) {
    setStatus(evento.target.value);
    setPagina(1);
  }

  function trocarGrupo(evento) {
    setIdGrupo(evento.target.value);
    setPagina(1);
  }

  function limparFiltros() {
    setBusca('');
    setStatus('');
    setIdGrupo('');
    setPagina(1);
  }

  async function excluirProjeto(projeto) {
    if (!window.confirm(`Excluir o projeto "${projeto.titulo}"? Os registros dependentes serão removidos.`)) {
      return;
    }

    try {
      await projetoService.excluir(projeto.id, token);
      setProjetos((atuais) => atuais.filter((item) => item.id !== projeto.id));
    } catch (falha) {
      setErro(falha.message);
    }
  }

  return (
    <section>
      <div className="pagina__cabecalho">
        <div>
          <h1 className="pagina__titulo">Projetos de pesquisa</h1>
          <p className="pagina__descricao">
            Veja os projetos dos grupos de pesquisa e as publicações que saíram deles.
          </p>
        </div>

        {podeCadastrarNoAcervo(usuario) && (
          <Link to="/projetos/cadastro" className="botao botao--primario botao--compacto">
            Cadastrar projeto
          </Link>
        )}
      </div>

      <form className="filtros-acervo" onSubmit={(evento) => evento.preventDefault()}>
        <label className="campo filtros-acervo__busca">
          <span>Buscar</span>
          <input
            type="search"
            value={busca}
            onChange={(evento) => setBusca(evento.target.value)}
            placeholder="Título do projeto"
          />
        </label>

        <label className="campo">
          <span>Situação</span>
          <select value={status} onChange={trocarStatus}>
            <option value="">Todas</option>
            {Object.entries(ROTULOS_STATUS).map(([valor, rotulo]) => (
              <option key={valor} value={valor}>
                {rotulo}
              </option>
            ))}
          </select>
        </label>

        <label className="campo">
          <span>Grupo de pesquisa</span>
          <select value={idGrupo} onChange={trocarGrupo}>
            <option value="">Todos os grupos</option>
            {grupos.map((grupo) => (
              <option key={grupo.id} value={grupo.id}>
                {grupo.nome}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          className="botao botao--discreto"
          onClick={limparFiltros}
          disabled={!filtrosAtivos}
        >
          Limpar
        </button>
      </form>

      {erro && <p className="alerta alerta--erro">{erro}</p>}
      {carregando && <p className="aviso-carregando">Carregando projetos...</p>}

      {!carregando && !erro && projetos.length === 0 && (
        <div className="aviso-central">
          {filtrosAtivos ? (
            <p>Nenhum projeto corresponde aos filtros escolhidos.</p>
          ) : (
            <p>Nenhum projeto de pesquisa cadastrado até agora.</p>
          )}
        </div>
      )}

      {!carregando && !erro && projetos.length > 0 && (
        <ul className="lista-acervo">
          {projetos.map((projeto) => (
            <li key={projeto.id} className="linha-acervo linha-acervo--navega">
              <span className="linha-acervo__area">
                {siglaDaArea(projeto.areas[0]?.nome)}
              </span>

              <Link className="linha-acervo__titulo linha-acervo__alvo" to={`/projetos/${projeto.id}`}>
                {projeto.titulo}
              </Link>

              {projeto.grupo && (
                <Link
                  className="linha-acervo__meta linha-acervo__meta--link"
                  to={`/grupos/${projeto.grupo.id}`}
                >
                  {projeto.grupo.nome}
                </Link>
              )}

              <span className="linha-acervo__meta">
                {projeto.totalPublicacoes}{' '}
                {projeto.totalPublicacoes === 1 ? 'publicação' : 'publicações'}
              </span>

              <span className={`etiqueta etiqueta--situacao etiqueta--${projeto.status}`}>
                {ROTULOS_STATUS[projeto.status] ?? projeto.status}
              </span>

              {podeCadastrarNoAcervo(usuario) && (
                <span className="linha-acervo__acoes">
                  <Link className="botao botao--discreto" to={`/projetos/${projeto.id}/editar`}>
                    Editar
                  </Link>
                  <button type="button" className="botao botao--discreto" onClick={() => excluirProjeto(projeto)}>
                    Excluir
                  </button>
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      {!carregando && !erro && <Paginacao paginacao={paginacao} aoTrocarPagina={setPagina} />}
    </section>
  );
}
