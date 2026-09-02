import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { Paginacao } from '../componentes/Paginacao.jsx';
import { PainelRapido } from '../componentes/PainelRapido.jsx';
import { useAuth } from '../contexto/AuthContext.jsx';
import * as publicacaoService from '../servicos/publicacaoService.js';
import * as areaService from '../servicos/areaService.js';
import {
  agruparPorAno,
  iniciaisDoNome,
  nomesDosAutores,
  ordenarAutores,
  podeCadastrarNoAcervo,
  POR_PAGINA,
  ROTULOS_TIPO,
  saudacao,
  siglaDaArea,
} from '../utils/acervo.js';

export function Publicacoes({ idPesquisadorFixo }) {
  const { usuario, token } = useAuth();

  const [publicacoes, setPublicacoes] = useState([]);
  const [areasConhecimento, setAreasConhecimento] = useState([]);
  const [paginacao, setPaginacao] = useState(null);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(true);

  const [busca, setBusca] = useState('');
  const [tipo, setTipo] = useState('');
  const [ano, setAno] = useState('');
  const [idArea, setIdArea] = useState('');
  const [pagina, setPagina] = useState(1);

  const [buscaAplicada, setBuscaAplicada] = useState('');
  const [selecionada, setSelecionada] = useState(null);

  useEffect(() => {
    let atual = true;
    areaService.listar().then((dados) => atual && setAreasConhecimento(dados.areas));
    return () => { atual = false; };
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

    const filtros = { busca: buscaAplicada, tipo, ano, idArea, pagina, porPagina: POR_PAGINA };
    if (idPesquisadorFixo) {
      filtros.idPesquisador = idPesquisadorFixo;
    }

    publicacaoService
      .listar(filtros)
      .then((dados) => {
        if (!atual) {
          return;
        }
        setPublicacoes(dados.publicacoes);
        setPaginacao(dados.paginacao);
        setSelecionada(null);
      })
      .catch((falha) => atual && setErro(falha.message))
      .finally(() => atual && setCarregando(false));

    return () => {
      atual = false;
    };
  }, [buscaAplicada, tipo, ano, idArea, pagina, idPesquisadorFixo]);

  const filtrosAtivos = Boolean(buscaAplicada.trim() || tipo || ano || idArea);

  function trocarTipo(evento) {
    setTipo(evento.target.value);
    setPagina(1);
  }

  function trocarAno(evento) {
    setAno(evento.target.value);
    setPagina(1);
  }

  function trocarArea(evento) {
    setIdArea(evento.target.value);
    setPagina(1);
  }

  function limparBusca() {
    setBusca('');
    setBuscaAplicada('');
    setTipo('');
    setAno('');
    setIdArea('');
    setPagina(1);
  }

  function limparFiltros() {
    setBusca('');
    setTipo('');
    setAno('');
    setIdArea('');
    setPagina(1);
  }

  async function excluirPublicacao(publicacao) {
    if (!window.confirm(`Excluir a publicação "${publicacao.titulo}"?`)) {
      return;
    }

    try {
      await publicacaoService.excluir(publicacao.id, token);
      setPublicacoes((atuais) => atuais.filter((item) => item.id !== publicacao.id));
      setSelecionada(null);
    } catch (falha) {
      setErro(falha.message);
    }
  }

  return (
    <section className="pagina">
      {!idPesquisadorFixo && (
        <h1 className="pagina__titulo">
          {usuario ? `${saudacao()}, ${usuario.nome.split(' ')[0]}` : 'Publicações'}
        </h1>
      )}

      <div className="busca-alta">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <input
          type="search"
          value={busca}
          onChange={(evento) => setBusca(evento.target.value)}
          placeholder="Buscar por título ou autor"
          aria-label="Buscar publicações"
        />
      </div>

      <form className="filtros-acervo filtros-acervo--triplo" onSubmit={(evento) => evento.preventDefault()}>

        <label className="campo">
          <span>Área</span>
          <select value={idArea} onChange={trocarArea}>
            <option value="">Todas</option>
            {areasConhecimento.map((area) => (
              <option key={area.id} value={area.id}>
                {area.nome}
              </option>
            ))}
          </select>
        </label>

        <label className="campo">
          <span>Tipo</span>
          <select value={tipo} onChange={trocarTipo}>
            <option value="">Todos</option>
            {Object.entries(ROTULOS_TIPO).map(([valor, rotulo]) => (
              <option key={valor} value={valor}>
                {rotulo}
              </option>
            ))}
          </select>
        </label>

        <label className="campo">
          <span>Ano</span>
          <input
            type="number"
            value={ano}
            onChange={trocarAno}
            placeholder="Ex.: 2024"
          />
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
      {carregando && <p className="aviso-carregando">Carregando publicações...</p>}

      {!carregando && !erro && publicacoes.length === 0 && (
        <div className="aviso-central">
          {filtrosAtivos ? (
            <p>Nenhuma publicação corresponde aos filtros escolhidos.</p>
          ) : (
            <p>O acervo ainda não tem publicações.</p>
          )}
        </div>
      )}

      {!carregando && !erro && publicacoes.length > 0 &&
        agruparPorAno(publicacoes).map((grupo) => (
          <section className="grupo-ano" key={grupo.ano}>
            <div className="grupo-ano__topo">
              <span className="grupo-ano__ponto" />
              <span className="grupo-ano__nome">{grupo.ano}</span>
              <span className="grupo-ano__conta">({grupo.itens.length})</span>
            </div>

            <ul className="lista-acervo">
              {grupo.itens.map((publicacao) => (
                <li key={publicacao.id}>
                  <button
                    type="button"
                    className="linha-acervo"
                    aria-current={selecionada?.id === publicacao.id}
                    onClick={() => setSelecionada(publicacao)}
                  >
                    <span className="linha-acervo__area">
                      {siglaDaArea(publicacao.areas?.[0]?.nome)}
                    </span>
                    <span className="linha-acervo__titulo">{publicacao.titulo}</span>
                    <span className="linha-acervo__tipo">
                      {ROTULOS_TIPO[publicacao.tipo] ?? publicacao.tipo}
                    </span>
                    <span className="pilha-autores">
                      {ordenarAutores(publicacao.autores).slice(0, 3).map((autor) => (
                        <span className="avatar" key={autor.id ?? autor.nome} title={autor.nome}>
                          {iniciaisDoNome(autor.nome)}
                        </span>
                      ))}
                    </span>
                    <span className="linha-acervo__ano">{publicacao.ano}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}

      {!carregando && !erro && <Paginacao paginacao={paginacao} aoTrocarPagina={setPagina} />}

      {selecionada && (
        <PainelRapido
          rotulo={`${ROTULOS_TIPO[selecionada.tipo] ?? selecionada.tipo} · ${selecionada.ano}`}
          titulo={selecionada.titulo}
          fatos={fatosDaPublicacao(selecionada)}
          paginaCompleta={`/publicacoes/${selecionada.id}`}
          aoFechar={() => setSelecionada(null)}
          acoes={
            <>
              {selecionada.doi && (
                <a
                  className="botao botao--discreto botao--compacto"
                  href={`https://doi.org/${selecionada.doi}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  DOI: {selecionada.doi}
                </a>
              )}

              <AcoesDaPublicacao
                publicacao={selecionada}
                usuario={usuario}
                aoExcluir={excluirPublicacao}
              />
            </>
          }
        />
      )}
    </section>
  );
}

function fatosDaPublicacao(publicacao) {
  return [
    {
      termo: 'Autoria',
      valor: ordenarAutores(publicacao.autores).map((autor) => (
        <span className="autor-linha" key={autor.id ?? autor.nome}>
          <span className="avatar">{iniciaisDoNome(autor.nome)}</span>
          {autor.nome}
        </span>
      )),
    },
    { termo: 'Veículo', valor: publicacao.veiculo },
    publicacao.projeto && {
      termo: 'Projeto',
      valor: <Link to={`/projetos/${publicacao.projeto.id}`}>{publicacao.projeto.titulo}</Link>,
    },
    publicacao.areas?.length > 0 && {
      termo: 'Áreas',
      valor: (
        <ul className="lista-chips">
          {publicacao.areas.map((area) => (
            <li className="chip" key={area.id}>{area.nome}</li>
          ))}
        </ul>
      ),
    },
  ].filter(Boolean);
}

function AcoesDaPublicacao({ publicacao, usuario, aoExcluir }) {
  if (!podeCadastrarNoAcervo(usuario)) {
    return null;
  }

  return (
    <div className="acoes-registro">
      <Link className="botao botao--discreto" to={`/publicacoes/${publicacao.id}/editar`}>
        Editar
      </Link>
      <button type="button" className="botao botao--discreto" onClick={() => aoExcluir(publicacao)}>
        Excluir
      </button>
    </div>
  );
}
