import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { Paginacao } from '../componentes/Paginacao.jsx';
import { useAuth } from '../contexto/AuthContext.jsx';
import * as vagaService from '../servicos/vagaService.js';
import { formatarData, podeCadastrarNoAcervo, POR_PAGINA } from '../utils/acervo.js';

export function Vagas() {
  const { usuario, token } = useAuth();
  const [vagas, setVagas] = useState([]);
  const [paginacao, setPaginacao] = useState(null);
  const [status, setStatus] = useState('');
  const [pagina, setPagina] = useState(1);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let atual = true;
    setCarregando(true);
    setErro('');

    vagaService
      .listar({ status, pagina, porPagina: POR_PAGINA })
      .then((dados) => {
        if (!atual) {
          return;
        }
        setVagas(dados.vagas);
        setPaginacao(dados.paginacao);
      })
      .catch((falha) => atual && setErro(falha.message))
      .finally(() => atual && setCarregando(false));

    return () => {
      atual = false;
    };
  }, [status, pagina]);

  async function excluir(vaga) {
    if (
      !window.confirm(
        `Excluir a vaga "${vaga.titulo}"? As candidaturas vinculadas também serão removidas.`,
      )
    ) {
      return;
    }

    try {
      await vagaService.excluir(vaga.id, token);
      setVagas((atuais) => atuais.filter((item) => item.id !== vaga.id));
    } catch (falha) {
      setErro(falha.message);
    }
  }

  return (
    <section>
      <div className="pagina__cabecalho">
        <div>
          <h1 className="pagina__titulo">Vagas</h1>
          <p className="pagina__descricao">Oportunidades vinculadas aos projetos de pesquisa.</p>
        </div>
        {podeCadastrarNoAcervo(usuario) && (
          <Link to="/vagas/cadastro" className="botao botao--primario botao--compacto">
            Cadastrar vaga
          </Link>
        )}
      </div>

      <form
        className="filtros-acervo filtros-acervo--duplo"
        onSubmit={(evento) => evento.preventDefault()}
      >
        <label className="campo">
          <span>Situação</span>
          <select
            value={status}
            onChange={(evento) => {
              setStatus(evento.target.value);
              setPagina(1);
            }}
          >
            <option value="">Todas</option>
            <option value="aberta">Abertas</option>
            <option value="fechada">Fechadas</option>
          </select>
        </label>
      </form>

      {erro && <p className="alerta alerta--erro">{erro}</p>}
      {carregando && <p className="aviso-carregando">Carregando vagas...</p>}

      {!carregando && !erro && vagas.length > 0 && (
        <ul className="lista-acervo">
          {vagas.map((vaga) => (
            <li key={vaga.id} className="linha-acervo linha-acervo--dupla">
              <span className="linha-acervo__corpo">
                <span className="linha-acervo__titulo">{vaga.titulo}</span>
                <span className="linha-acervo__resumo">
                  <Link to={`/projetos/${vaga.projeto.id}`}>{vaga.projeto.titulo}</Link>
                  {' · '}
                  {vaga.requisitos || 'Sem requisitos informados.'}
                </span>
                <span className="linha-acervo__resumo">
                  Aberta em {formatarData(vaga.dataAbertura)} · {vaga.totalCandidaturas}{' '}
                  {vaga.totalCandidaturas === 1 ? 'candidatura' : 'candidaturas'}
                </span>
              </span>

              <span className="linha-acervo__meta">
                {vaga.qtdVagas} {vaga.qtdVagas === 1 ? 'vaga' : 'vagas'}
              </span>

              <span className={`etiqueta etiqueta--${vaga.status}`}>{vaga.status}</span>

              {podeCadastrarNoAcervo(usuario) && (
                <span className="linha-acervo__acoes">
                  <Link className="botao botao--discreto" to={`/vagas/${vaga.id}/editar`}>
                    Editar
                  </Link>
                  <button
                    className="botao botao--discreto"
                    type="button"
                    onClick={() => excluir(vaga)}
                  >
                    Excluir
                  </button>
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      {!carregando && !erro && vagas.length === 0 && (
        <div className="aviso-central">
          <p>Nenhuma vaga encontrada.</p>
        </div>
      )}

      {!carregando && !erro && <Paginacao paginacao={paginacao} aoTrocarPagina={setPagina} />}
    </section>
  );
}
