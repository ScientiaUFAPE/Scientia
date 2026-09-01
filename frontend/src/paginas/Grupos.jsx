import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { Paginacao } from '../componentes/Paginacao.jsx';
import { useAuth } from '../contexto/AuthContext.jsx';
import * as grupoService from '../servicos/grupoService.js';
import { podeCadastrarNoAcervo, POR_PAGINA } from '../utils/acervo.js';

export function Grupos() {
  const { usuario, token } = useAuth();
  const [grupos, setGrupos] = useState([]);
  const [paginacao, setPaginacao] = useState(null);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(true);

  const [busca, setBusca] = useState('');
  const [pagina, setPagina] = useState(1);

  const [buscaAplicada, setBuscaAplicada] = useState('');

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

    grupoService
      .listar({ busca: buscaAplicada, pagina, porPagina: POR_PAGINA })
      .then((dados) => {
        if (!atual) {
          return;
        }
        setGrupos(dados.grupos);
        setPaginacao(dados.paginacao);
      })
      .catch((falha) => atual && setErro(falha.message))
      .finally(() => atual && setCarregando(false));

    return () => {
      atual = false;
    };
  }, [buscaAplicada, pagina]);

  const filtrosAtivos = Boolean(buscaAplicada.trim());

  async function excluirGrupo(grupo) {
    if (!window.confirm(`Excluir o grupo "${grupo.nome}"?`)) {
      return;
    }

    try {
      await grupoService.excluir(grupo.id, token);
      setGrupos((atuais) => atuais.filter((item) => item.id !== grupo.id));
    } catch (falha) {
      setErro(falha.message);
    }
  }

  return (
    <section>
      <div className="pagina__cabecalho">
        <div>
          <h1 className="pagina__titulo">Grupos de pesquisa</h1>
          <p className="pagina__descricao">
            Conheça os grupos que reúnem os pesquisadores e os projetos do curso.
          </p>
        </div>
        {podeCadastrarNoAcervo(usuario) && (
          <Link to="/grupos/cadastro" className="botao botao--primario botao--compacto">
            Cadastrar grupo
          </Link>
        )}
      </div>

      <form
        className="filtros-acervo filtros-acervo--simples"
        onSubmit={(evento) => evento.preventDefault()}
      >
        <label className="campo filtros-acervo__busca">
          <span>Buscar</span>
          <input
            type="search"
            value={busca}
            onChange={(evento) => setBusca(evento.target.value)}
            placeholder="Nome do grupo"
          />
        </label>

        <button
          type="button"
          className="botao botao--discreto"
          onClick={() => setBusca('')}
          disabled={!filtrosAtivos}
        >
          Limpar
        </button>
      </form>

      {erro && <p className="alerta alerta--erro">{erro}</p>}
      {carregando && <p className="aviso-carregando">Carregando grupos...</p>}

      {!carregando && !erro && grupos.length === 0 && (
        <div className="aviso-central">
          {filtrosAtivos ? (
            <p>Nenhum grupo corresponde à busca.</p>
          ) : (
            <p>Nenhum grupo de pesquisa cadastrado até agora.</p>
          )}
        </div>
      )}

      {!carregando && !erro && grupos.length > 0 && (
        <ul className="lista-acervo">
          {grupos.map((grupo) => (
            <li key={grupo.id} className="linha-acervo linha-acervo--navega">
              <span className="linha-acervo__area">{grupo.anoCriacao}</span>

              <Link className="linha-acervo__titulo linha-acervo__alvo" to={`/grupos/${grupo.id}`}>
                {grupo.nome}
              </Link>

              <span className="linha-acervo__meta">
                {grupo.totalProjetos} {grupo.totalProjetos === 1 ? 'projeto' : 'projetos'} ·{' '}
                {grupo.totalMembros} {grupo.totalMembros === 1 ? 'membro' : 'membros'}
              </span>

              {grupo.linkDgp && (
                <a
                  className="linha-acervo__acoes botao botao--discreto"
                  href={grupo.linkDgp}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Perfil no Diretório de Grupos"
                  title="Perfil no Diretório de Grupos"
                >
                  DGP
                </a>
              )}

              {podeCadastrarNoAcervo(usuario) && (
                <span className="linha-acervo__acoes">
                  <Link className="botao botao--discreto" to={`/grupos/${grupo.id}/editar`}>
                    Editar
                  </Link>
                  <button
                    type="button"
                    className="botao botao--discreto"
                    onClick={() => excluirGrupo(grupo)}
                  >
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
