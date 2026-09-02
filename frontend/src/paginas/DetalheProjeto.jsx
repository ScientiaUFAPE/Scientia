import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import * as projetoService from '../servicos/projetoService.js';
import {
  formatarData,
  formatarPeriodo,
  ROTULOS_PAPEL,
  ROTULOS_STATUS,
  ROTULOS_TIPO,
} from '../utils/acervo.js';

export function DetalheProjeto() {
  const { id } = useParams();

  const [projeto, setProjeto] = useState(null);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let atual = true;
    setCarregando(true);
    setErro('');

    projetoService
      .buscarPorId(id)
      .then((dados) => atual && setProjeto(dados.projeto))
      .catch((falha) => atual && setErro(falha.message))
      .finally(() => atual && setCarregando(false));

    return () => {
      atual = false;
    };
  }, [id]);

  if (carregando) {
    return <p className="aviso-carregando">Carregando projeto...</p>;
  }

  if (erro) {
    return (
      <section>
        <p className="alerta alerta--erro">{erro}</p>
        <Link to="/projetos">Voltar para a lista de projetos</Link>
      </section>
    );
  }

  if (!projeto) {
    return null;
  }

  return (
    <section className="detalhe">
      <Link to="/projetos" className="detalhe__voltar">
        ← Projetos
      </Link>

      <div className="detalhe__cabecalho">
        <h1 className="pagina__titulo">{projeto.titulo}</h1>
        <span className={`etiqueta etiqueta--situacao etiqueta--${projeto.status}`}>
          {ROTULOS_STATUS[projeto.status] ?? projeto.status}
        </span>
      </div>

      <p className="pagina__descricao">{projeto.resumo ?? 'Projeto sem resumo cadastrado.'}</p>

      <div className="cartoes">
        <article className="cartao">
          <h2>Ficha do projeto</h2>
          <dl className="lista-dados">
            <dt>Período</dt>
            <dd>{formatarPeriodo(projeto.dataInicio, projeto.dataFim)}</dd>
            <dt>Grupo</dt>
            <dd>
              {projeto.grupo ? (
                <Link to={`/grupos/${projeto.grupo.id}`}>{projeto.grupo.nome}</Link>
              ) : (
                'Não informado'
              )}
            </dd>
            <dt>Edital</dt>
            <dd>
              {projeto.edital
                ? `${projeto.edital.nome} (${projeto.edital.ano})`
                : 'Sem edital vinculado'}
            </dd>
            <dt>Áreas</dt>
            <dd>
              <ul className="lista-chips">
                {projeto.areas.map((area) => (
                  <li key={area.id} className="chip">
                    {area.nome}
                  </li>
                ))}
              </ul>
            </dd>
          </dl>
        </article>

        <article className="cartao">
          <h2>Equipe</h2>
          {projeto.equipe.length === 0 ? (
            <p>Nenhum pesquisador vinculado ao projeto.</p>
          ) : (
            <ul className="lista-pessoas">
              {projeto.equipe.map((integrante) => (
                <li key={integrante.id} className="lista-pessoas__item">
                  <span className="lista-pessoas__nome">{integrante.nome}</span>
                  <span className={`etiqueta etiqueta--papel etiqueta--${integrante.papel}`}>
                    {ROTULOS_PAPEL[integrante.papel] ?? integrante.papel}
                  </span>
                  <span className="lista-pessoas__detalhe">
                    desde {formatarData(integrante.dataEntrada)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </article>
      </div>

      <h2 className="detalhe__secao">Publicações do projeto</h2>

      {projeto.publicacoes.length === 0 ? (
        <p className="pagina__descricao">Este projeto ainda não gerou publicações.</p>
      ) : (
        <ul className="lista-acervo">
          {projeto.publicacoes.map((publicacao) => (
            <li key={publicacao.id} className="linha-acervo">
              <span className="linha-acervo__titulo">{publicacao.titulo}</span>
              <span className="linha-acervo__tipo">
                {ROTULOS_TIPO[publicacao.tipo] ?? publicacao.tipo}
              </span>
              <span className="linha-acervo__ano">{publicacao.ano}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
