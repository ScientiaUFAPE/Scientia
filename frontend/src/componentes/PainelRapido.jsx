import { createContext, useContext, useEffect } from 'react';
import { Link } from 'react-router-dom';

const semAviso = () => {};

export const PainelRapidoContexto = createContext(semAviso);

export function PainelRapido({ rotulo, titulo, avatar, fatos = [], acoes, paginaCompleta, aoFechar }) {
  const avisar = useContext(PainelRapidoContexto);

  useEffect(() => {
    avisar(true);

    return () => avisar(false);
  }, [avisar]);

  useEffect(() => {
    function fecharComEsc(evento) {
      if (evento.key === 'Escape') {
        aoFechar();
      }
    }

    document.addEventListener('keydown', fecharComEsc);

    return () => document.removeEventListener('keydown', fecharComEsc);
  }, [aoFechar]);

  return (
    <>
      <button
        type="button"
        className="painel-rapido__scrim"
        aria-label="Fechar o painel"
        onClick={aoFechar}
      />

      <aside className="painel-rapido" aria-label={titulo}>
        <div className="painel-rapido__topo">
          <span className="painel-rapido__tipo">{rotulo}</span>
          <button type="button" className="painel-rapido__fechar" title="Fechar" onClick={aoFechar}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
              <path d="m6 6 12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        <div className="painel-rapido__identidade">
          {avatar && <span className="avatar painel-rapido__avatar">{avatar}</span>}
          <h2 className="painel-rapido__titulo">{titulo}</h2>
        </div>

        {fatos.length > 0 && (
          <dl>
            {fatos.map((fato) => (
              <div className="painel-rapido__fato" key={fato.termo}>
                <dt>{fato.termo}</dt>
                <dd>{fato.valor}</dd>
              </div>
            ))}
          </dl>
        )}

        {(paginaCompleta || acoes) && (
          <div className="painel-rapido__acoes">
            {paginaCompleta && (
              <Link className="botao botao--primario" to={paginaCompleta}>
                Abrir página completa
              </Link>
            )}
            {acoes}
          </div>
        )}
      </aside>
    </>
  );
}
