import { useEffect } from 'react';

export function useAtalhoBusca(referencia) {
  useEffect(() => {
    function focar(evento) {
      if (evento.key !== '/' || evento.metaKey || evento.ctrlKey || evento.altKey) return;
      const alvo = evento.target;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(alvo?.tagName) || alvo?.isContentEditable) return;
      evento.preventDefault();
      referencia.current?.focus();
    }

    document.addEventListener('keydown', focar);
    return () => document.removeEventListener('keydown', focar);
  }, [referencia]);
}

export function BuscaAlta({ referencia, value, onChange, placeholder, rotulo }) {
  return (
    <div className="busca-alta">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
      <input
        ref={referencia}
        type="search"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        aria-label={rotulo}
      />
      <span className="busca-alta__atalho" aria-hidden="true">/</span>
    </div>
  );
}

export function SeletorPilula({ rotulo, valor, value, onChange, children }) {
  return (
    <span className="pilula pilula--menu">
      {rotulo}
      <span className="pilula__valor">{valor}</span>
      <Chevron />
      <select value={value} onChange={onChange} aria-label={rotulo}>
        {children}
      </select>
    </span>
  );
}

export function CabecalhoGrupo({ nome, quantidade, cor }) {
  return (
    <div className="grupo-ano__topo">
      <span className="grupo-ano__ponto" style={cor ? { backgroundColor: cor } : undefined} />
      <h2 className="grupo-ano__nome">{nome}</h2>
      <span className="grupo-ano__conta">{quantidade}</span>
      <span className="grupo-ano__fio" />
    </div>
  );
}

export function SeloSigla({ children }) {
  return <span className="selo-sigla">{children}</span>;
}

export function IconeLinkExterno() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <path d="M14 4h6v6" />
      <path d="M20 4 10 14" />
      <path d="M18 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5" />
    </svg>
  );
}

function Chevron() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}
