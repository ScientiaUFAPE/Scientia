import { useRef, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';

import { useRolagemDiscreta } from '../utils/useRolagemDiscreta.js';
import { BarraLateral, Glifo, ROTULOS_ROTA } from './BarraLateral.jsx';
import { PainelRapidoContexto } from './PainelRapido.jsx';

function localAtual(caminho) {
  const raiz = `/${caminho.split('/')[1] ?? ''}`;

  return ROTULOS_ROTA[raiz] ?? null;
}

/** Moldura das telas internas: rail à esquerda, canvas com a página da vez. */
export function Layout() {
  const { pathname } = useLocation();
  const local = localAtual(pathname);
  const canvas = useRef(null);
  const [comPainel, setComPainel] = useState(false);

  useRolagemDiscreta(canvas);

  return (
    <div className={`layout${comPainel ? ' layout--com-painel' : ''}`}>
      <BarraLateral />

      <main className="canvas rolagem-discreta" ref={canvas}>
        {local && (
          <div className="barra">
            <div className="barra__local">
              <Glifo nome={local[1]} tamanho={17} />
              {local[0]}
            </div>
          </div>
        )}

        <div className="layout__conteudo">
          <PainelRapidoContexto.Provider value={setComPainel}>
            <Outlet />
          </PainelRapidoContexto.Provider>
        </div>
      </main>
    </div>
  );
}
