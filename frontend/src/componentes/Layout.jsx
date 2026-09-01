import { Outlet, useLocation } from 'react-router-dom';

import { BarraLateral, Glifo, ROTULOS_ROTA } from './BarraLateral.jsx';

function localAtual(caminho) {
  const raiz = `/${caminho.split('/')[1] ?? ''}`;

  return ROTULOS_ROTA[raiz] ?? null;
}

/** Moldura das telas internas: rail à esquerda, canvas com a página da vez. */
export function Layout() {
  const { pathname } = useLocation();
  const local = localAtual(pathname);

  return (
    <div className="layout">
      <BarraLateral />

      <main className="canvas">
        {local && (
          <div className="barra">
            <div className="barra__local">
              <Glifo nome={local[1]} tamanho={17} />
              {local[0]}
            </div>
          </div>
        )}

        <div className="layout__conteudo">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
