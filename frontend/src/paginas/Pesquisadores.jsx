import { useEffect, useState } from 'react';

import { Paginacao } from '../componentes/Paginacao.jsx';
import { PainelRapido } from '../componentes/PainelRapido.jsx';
import * as pesquisadorService from '../servicos/pesquisadorService.js';
import { iniciaisDoNome, POR_PAGINA, ROTULOS_VINCULO } from '../utils/acervo.js';

export function Pesquisadores() {
  const [pesquisadores, setPesquisadores] = useState([]);
  const [paginacao, setPaginacao] = useState(null);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(true);

  const [busca, setBusca] = useState('');
  const [vinculo, setVinculo] = useState('');
  const [pagina, setPagina] = useState(1);

  const [buscaAplicada, setBuscaAplicada] = useState('');
  const [selecionado, setSelecionado] = useState(null);

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

    pesquisadorService
      .listar({ busca: buscaAplicada, vinculo, pagina, porPagina: POR_PAGINA })
      .then((dados) => {
        if (!atual) {
          return;
        }
        setPesquisadores(dados.pesquisadores);
        setPaginacao(dados.paginacao);
        setSelecionado(null);
      })
      .catch((falha) => atual && setErro(falha.message))
      .finally(() => atual && setCarregando(false));

    return () => {
      atual = false;
    };
  }, [buscaAplicada, vinculo, pagina]);

  const filtrosAtivos = Boolean(buscaAplicada.trim() || vinculo);

  function trocarVinculo(evento) {
    setVinculo(evento.target.value);
    setPagina(1);
  }

  function limparFiltros() {
    setBusca('');
    setVinculo('');
    setPagina(1);
  }

  return (
    <section>
      <div className="pagina__cabecalho">
        <div>
          <h1 className="pagina__titulo">Pesquisadores</h1>
          <p className="pagina__descricao">
            Quem assina as produções do acervo, com o vínculo e o currículo Lattes.
          </p>
        </div>
      </div>

      <form
        className="filtros-acervo filtros-acervo--duplo"
        onSubmit={(evento) => evento.preventDefault()}
      >
        <label className="campo filtros-acervo__busca">
          <span>Buscar</span>
          <input
            type="search"
            value={busca}
            onChange={(evento) => setBusca(evento.target.value)}
            placeholder="Nome do pesquisador"
          />
        </label>

        <label className="campo">
          <span>Vínculo</span>
          <select value={vinculo} onChange={trocarVinculo}>
            <option value="">Todos</option>
            {Object.entries(ROTULOS_VINCULO).map(([valor, rotulo]) => (
              <option key={valor} value={valor}>
                {rotulo}
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
      {carregando && <p className="aviso-carregando">Carregando pesquisadores...</p>}

      {!carregando && !erro && pesquisadores.length === 0 && (
        <div className="aviso-central">
          {filtrosAtivos ? (
            <p>Nenhum pesquisador corresponde aos filtros escolhidos.</p>
          ) : (
            <p>Nenhum pesquisador cadastrado até agora.</p>
          )}
        </div>
      )}

      {!carregando && !erro && pesquisadores.length > 0 && (
        <ul className="lista-acervo">
          {pesquisadores.map((pesquisador) => (
            <li key={pesquisador.id}>
              <button
                type="button"
                className="linha-acervo"
                aria-current={selecionado?.id === pesquisador.id}
                onClick={() => setSelecionado(pesquisador)}
              >
                <span className="avatar linha-acervo__avatar">
                  {iniciaisDoNome(pesquisador.nome)}
                </span>
                <span className="linha-acervo__titulo">{pesquisador.nome}</span>
                <span className="linha-acervo__tipo">
                  {ROTULOS_VINCULO[pesquisador.vinculo] ?? pesquisador.vinculo}
                </span>
                <span className="linha-acervo__meta">
                  {contarPublicacoes(pesquisador.totalPublicacoes)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {!carregando && !erro && <Paginacao paginacao={paginacao} aoTrocarPagina={setPagina} />}

      {selecionado && (
        <PainelRapido
          rotulo={ROTULOS_VINCULO[selecionado.vinculo] ?? selecionado.vinculo}
          titulo={selecionado.nome}
          fatos={fatosDoPesquisador(selecionado)}
          paginaCompleta={`/pesquisadores/${selecionado.id}`}
          aoFechar={() => setSelecionado(null)}
        />
      )}
    </section>
  );
}

function fatosDoPesquisador(pesquisador) {
  return [
    { termo: 'Vínculo', valor: ROTULOS_VINCULO[pesquisador.vinculo] ?? pesquisador.vinculo },
    pesquisador.numeroLattes && {
      termo: 'Lattes',
      valor: (
        <a
          href={`http://lattes.cnpq.br/${pesquisador.numeroLattes}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          {pesquisador.numeroLattes}
        </a>
      ),
    },
    { termo: 'Publicações', valor: contarPublicacoes(pesquisador.totalPublicacoes) },
  ].filter(Boolean);
}

function contarPublicacoes(total = 0) {
  return `${total} ${total === 1 ? 'publicação' : 'publicações'}`;
}
