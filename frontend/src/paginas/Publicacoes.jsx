import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { Paginacao } from '../componentes/Paginacao.jsx';
import { useAuth } from '../contexto/AuthContext.jsx';
import * as publicacaoService from '../servicos/publicacaoService.js';
import * as areaService from '../servicos/areaService.js';
import {
  nomesDosAutores,
  podeCadastrarNoAcervo,
  POR_PAGINA,
  ROTULOS_TIPO,
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
    } catch (falha) {
      setErro(falha.message);
    }
  }

  return (
    <section className="pagina">
      {!idPesquisadorFixo && (
        <div className="pagina__cabecalho">
          <div className="pagina__titulo">
            <h1>Publicações</h1>
          </div>

          {podeCadastrarNoAcervo(usuario) && (
            <Link to="/publicacoes/cadastro" className="botao botao--primario botao--compacto">
              Cadastrar publicação
            </Link>
          )}
        </div>
      )}

      <form className="filtros-acervo" onSubmit={(evento) => evento.preventDefault()}>
        <label className="campo filtros-acervo__busca">
          <span>Buscar</span>
          <input
            type="search"
            value={busca}
            onChange={(evento) => setBusca(evento.target.value)}
            placeholder="Título ou autor"
          />
        </label>

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

      {!carregando && !erro && publicacoes.length > 0 && (
        <ul className="lista-acervo">
          {publicacoes.map((publicacao) => (
            <li key={publicacao.id} className="cartao cartao-acervo">
              <div className="cartao-acervo__topo">
                <span className="etiqueta etiqueta--tipo">
                  {ROTULOS_TIPO[publicacao.tipo] ?? publicacao.tipo}
                </span>
                <span className="cartao-acervo__ano">{publicacao.ano}</span>
              </div>

              <h2 className="cartao-acervo__titulo">
                <Link to={`/publicacoes/${publicacao.id}`}>
                  {publicacao.titulo}
                </Link>
              </h2>
              <p className="cartao-acervo__autores">{nomesDosAutores(publicacao.autores)}</p>
              <p className="cartao-acervo__veiculo">{publicacao.veiculo}</p>

              {publicacao.projeto && (
                <p className="cartao-acervo__vinculo">
                  Projeto:{' '}
                  <Link to={`/projetos/${publicacao.projeto.id}`}>
                    {publicacao.projeto.titulo}
                  </Link>
                </p>
              )}

              {publicacao.doi && (
                <a
                  className="cartao-acervo__link"
                  href={`https://doi.org/${publicacao.doi}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  DOI: {publicacao.doi}
                </a>
              )}

              {podeCadastrarNoAcervo(usuario) && (
                <div className="acoes-registro">
                  <Link className="botao botao--discreto" to={`/publicacoes/${publicacao.id}/editar`}>Editar</Link>
                  <button type="button" className="botao botao--discreto" onClick={() => excluirPublicacao(publicacao)}>Excluir</button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {!carregando && !erro && <Paginacao paginacao={paginacao} aoTrocarPagina={setPagina} />}
    </section>
  );
}
