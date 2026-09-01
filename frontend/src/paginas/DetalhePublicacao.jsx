import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { useAuth } from '../contexto/AuthContext.jsx';
import * as publicacaoService from '../servicos/publicacaoService.js';
import { ROTULOS_TIPO, nomesDosAutores } from '../utils/acervo.js';

export function DetalhePublicacao() {
  const { id } = useParams();
  const { token } = useAuth();

  const [publicacao, setPublicacao] = useState(null);
  const [relacionadas, setRelacionadas] = useState([]);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let atual = true;
    setCarregando(true);
    setErro('');

    Promise.all([
      publicacaoService.buscarPorId(id),
      publicacaoService.buscarRelacionadas(id, token, 5)
    ])
      .then(([dadosPub, dadosRel]) => {
        if (!atual) return;
        setPublicacao(dadosPub.publicacao);
        setRelacionadas(dadosRel.publicacoes || []);
      })
      .catch((falha) => atual && setErro(falha.message))
      .finally(() => atual && setCarregando(false));

    return () => {
      atual = false;
    };
  }, [id, token]);

  if (carregando) {
    return <p className="aviso-carregando">Carregando publicação...</p>;
  }

  if (erro) {
    return (
      <section>
        <p className="alerta alerta--erro">{erro}</p>
        <Link to="/publicacoes">Voltar para a lista de publicações</Link>
      </section>
    );
  }

  if (!publicacao) {
    return null;
  }

  return (
    <section className="detalhe">
      <Link to="/publicacoes" className="detalhe__voltar">
        ← Publicações
      </Link>

      <div className="detalhe__cabecalho">
        <h1 className="pagina__titulo">{publicacao.titulo}</h1>
      </div>

      <div className="cartoes">
        <article className="cartao">
          <h2>Ficha da publicação</h2>
          <dl className="lista-dados">
            <dt>Tipo</dt>
            <dd>{ROTULOS_TIPO[publicacao.tipo] ?? publicacao.tipo}</dd>
            <dt>Ano</dt>
            <dd>{publicacao.ano}</dd>
            <dt>Veículo</dt>
            <dd>{publicacao.veiculo}</dd>
            <dt>DOI</dt>
            <dd>
              {publicacao.doi ? (
                <a href={`https://doi.org/${publicacao.doi}`} target="_blank" rel="noopener noreferrer">
                  {publicacao.doi}
                </a>
              ) : (
                'Não informado'
              )}
            </dd>
            <dt>Projeto</dt>
            <dd>
              {publicacao.projeto ? (
                <Link to={`/projetos/${publicacao.projeto.id}`}>{publicacao.projeto.titulo}</Link>
              ) : (
                'Não vinculado'
              )}
            </dd>
            <dt>Áreas</dt>
            <dd>
              <ul className="lista-chips">
                {publicacao.areas && publicacao.areas.map((area) => (
                  <li key={area.id} className="chip">
                    {area.nome}
                  </li>
                ))}
              </ul>
            </dd>
          </dl>
        </article>

        <article className="cartao">
          <h2>Autores</h2>
          {publicacao.autores && publicacao.autores.length === 0 ? (
            <p>Nenhum autor vinculado.</p>
          ) : (
            <ul className="lista-pessoas">
              {publicacao.autores && publicacao.autores.map((autor) => (
                <li key={autor.id} className="lista-pessoas__item">
                  <Link to={`/pesquisadores/${autor.id}`} className="lista-pessoas__nome">
                    {autor.nome}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </article>
      </div>

      <h2 className="detalhe__secao">Produções relacionadas</h2>

      {relacionadas.length === 0 ? (
        <p className="pagina__descricao">Nenhuma produção relacionada encontrada.</p>
      ) : (
        <ul className="lista-acervo">
          {relacionadas.map((relacionada) => (
            <li key={relacionada.id} className="cartao cartao-acervo">
              <div className="cartao-acervo__topo">
                <span className="etiqueta etiqueta--tipo">
                  {ROTULOS_TIPO[relacionada.tipo] ?? relacionada.tipo}
                </span>
                <span className="cartao-acervo__ano">{relacionada.ano}</span>
              </div>
              <h3 className="cartao-acervo__titulo">
                <Link to={`/publicacoes/${relacionada.id}`}>{relacionada.titulo}</Link>
              </h3>
              <p className="cartao-acervo__autores">{nomesDosAutores(relacionada.autores)}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
