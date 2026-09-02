import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import { Paginacao } from '../componentes/Paginacao.jsx';
import { PainelRapido } from '../componentes/PainelRapido.jsx';
import { useAuth } from '../contexto/AuthContext.jsx';
import * as publicacaoService from '../servicos/publicacaoService.js';
import * as areaService from '../servicos/areaService.js';
import * as relatorioService from '../servicos/relatorioService.js';
import {
  agruparPorAno,
  iniciaisDoNome,
  ordenarAutores,
  periodoDosAnos,
  podeCadastrarNoAcervo,
  POR_PAGINA,
  ROTULOS_TIPO,
  siglaDaArea,
} from '../utils/acervo.js';

export function Publicacoes({ idPesquisadorFixo }) {
  const { usuario, token } = useAuth();

  const [publicacoes, setPublicacoes] = useState([]);
  const [areasConhecimento, setAreasConhecimento] = useState([]);
  const [indicadores, setIndicadores] = useState(null);
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

  const campoBusca = useRef(null);

  useEffect(() => {
    let atual = true;
    areaService.listar().then((dados) => atual && setAreasConhecimento(dados.areas));
    relatorioService
      .obterIndicadoresProducoes()
      .then((dados) => atual && setIndicadores(dados.indicadores))
      .catch(() => {});
    return () => { atual = false; };
  }, []);

  useEffect(() => {
    function focarBusca(evento) {
      if (evento.key !== '/' || evento.metaKey || evento.ctrlKey || evento.altKey) {
        return;
      }

      const alvo = evento.target;
      const etiqueta = alvo?.tagName;

      if (etiqueta === 'INPUT' || etiqueta === 'TEXTAREA' || etiqueta === 'SELECT') {
        return;
      }

      if (alvo?.isContentEditable) {
        return;
      }

      evento.preventDefault();
      campoBusca.current?.focus();
    }

    document.addEventListener('keydown', focarBusca);

    return () => document.removeEventListener('keydown', focarBusca);
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
  const tiposDoAcervo = indicadores?.porTipo ?? [];
  const anosDoAcervo = [...(indicadores?.porAno ?? [])].sort((um, outro) => outro.ano - um.ano);
  const mostraContagem = !idPesquisadorFixo;

  function escolherTipo(valor) {
    setTipo(valor);
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
        <div className="cabecalho-acervo">
          <h1 className="pagina__titulo">Publicações</h1>
          {indicadores && (
            <span className="cabecalho-acervo__resumo">{resumoDoAcervo(indicadores)}</span>
          )}
        </div>
      )}

      <div className="busca-alta">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <input
          ref={campoBusca}
          type="search"
          value={busca}
          onChange={(evento) => setBusca(evento.target.value)}
          placeholder="Buscar por título ou autor"
          aria-label="Buscar publicações"
        />
        <span className="busca-alta__atalho" aria-hidden="true">/</span>
      </div>

      <div className="filtros-pilulas">
        <button
          type="button"
          className="pilula"
          aria-pressed={tipo === ''}
          onClick={() => escolherTipo('')}
        >
          Todos
          {mostraContagem && indicadores && (
            <span className="pilula__conta">{indicadores.totalProducoes}</span>
          )}
        </button>

        {tiposDoAcervo.map((item) => (
          <button
            type="button"
            className="pilula"
            key={item.tipo}
            aria-pressed={tipo === item.tipo}
            onClick={() => escolherTipo(item.tipo)}
          >
            {ROTULOS_TIPO[item.tipo] ?? item.tipo}
            {mostraContagem && <span className="pilula__conta">{item.quantidade}</span>}
          </button>
        ))}

        <span className="filtros-pilulas__fio" />

        <span className="pilula pilula--menu">
          Área
          <span className="pilula__valor">{nomeDaArea(areasConhecimento, idArea)}</span>
          <Chevron />
          <select value={idArea} onChange={trocarArea} aria-label="Área">
            <option value="">Todas</option>
            {areasConhecimento.map((area) => (
              <option key={area.id} value={area.id}>
                {area.nome}
              </option>
            ))}
          </select>
        </span>

        <span className="pilula pilula--menu">
          Ano
          <span className="pilula__valor">{ano || 'Todos'}</span>
          <Chevron />
          <select value={ano} onChange={trocarAno} aria-label="Ano">
            <option value="">Todos</option>
            {anosDoAcervo.map((item) => (
              <option key={item.ano} value={item.ano}>
                {item.ano}
              </option>
            ))}
          </select>
        </span>

        {filtrosAtivos && (
          <button type="button" className="pilula pilula--limpar" onClick={limparFiltros}>
            Limpar
          </button>
        )}

        {paginacao && (
          <span className="filtros-pilulas__resumo">
            {resumoDosResultados(paginacao.total, buscaAplicada)}
          </span>
        )}
      </div>

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
              <span className="grupo-ano__conta">{grupo.itens.length}</span>
              <span className="grupo-ano__fio" />
            </div>

            <ul className="lista-acervo">
              {grupo.itens.map((publicacao) => (
                <li key={publicacao.id}>
                  <LinhaDaPublicacao
                    publicacao={publicacao}
                    selecionada={selecionada?.id === publicacao.id}
                    aoAbrir={() => setSelecionada(publicacao)}
                  />
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

function LinhaDaPublicacao({ publicacao, selecionada, aoAbrir }) {
  function abrirComTeclado(evento) {
    if (evento.key === 'Enter' || evento.key === ' ') {
      evento.preventDefault();
      aoAbrir();
    }
  }

  return (
    <div
      className="linha-acervo linha-publicacao"
      role="button"
      tabIndex={0}
      aria-current={selecionada}
      onClick={aoAbrir}
      onKeyDown={abrirComTeclado}
    >
      <span className="selo-sigla">{siglaDaArea(publicacao.areas?.[0]?.nome)}</span>

      <span className="linha-publicacao__corpo">
        <Link
          className="linha-publicacao__titulo"
          to={`/publicacoes/${publicacao.id}`}
          onClick={(evento) => evento.stopPropagation()}
        >
          {publicacao.titulo}
        </Link>
        <span className="linha-publicacao__veiculo">{publicacao.veiculo}</span>
      </span>

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

      {publicacao.doi && (
        <a
          className="linha-publicacao__doi"
          href={`https://doi.org/${publicacao.doi}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Abrir DOI"
          onClick={(evento) => evento.stopPropagation()}
        >
          <IconeLinkExterno />
        </a>
      )}
    </div>
  );
}

function Chevron() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function IconeLinkExterno() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M14 4h6v6" />
      <path d="M20 4 10 14" />
      <path d="M18 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5" />
    </svg>
  );
}

function nomeDaArea(areas, idArea) {
  const escolhida = areas.find((area) => String(area.id) === String(idArea));

  return escolhida ? escolhida.nome : 'Todas';
}

function resumoDoAcervo(indicadores) {
  const periodo = periodoDosAnos(indicadores.porAno);
  const partes = [`${indicadores.totalProducoes} no acervo`];

  if (periodo) {
    partes.push(periodo);
  }

  return partes.join(' · ');
}

function resumoDosResultados(total, termo) {
  const contagem = `${total} ${total === 1 ? 'resultado' : 'resultados'}`;

  return termo.trim() ? `${contagem} para “${termo.trim()}”` : contagem;
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
