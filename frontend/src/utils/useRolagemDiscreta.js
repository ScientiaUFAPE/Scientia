import { useEffect } from 'react';

const ESPERA = 900;

export function useRolagemDiscreta(referencia) {
  useEffect(() => {
    const alvo = referencia.current;

    if (!alvo) {
      return undefined;
    }

    let relogio;

    function mostrar() {
      alvo.classList.add('rolando');
      clearTimeout(relogio);
      relogio = setTimeout(() => alvo.classList.remove('rolando'), ESPERA);
    }

    function esconder() {
      clearTimeout(relogio);
      alvo.classList.remove('rolando');
    }

    alvo.addEventListener('mousemove', mostrar);
    alvo.addEventListener('scroll', mostrar, { passive: true });
    alvo.addEventListener('mouseleave', esconder);

    return () => {
      clearTimeout(relogio);
      alvo.removeEventListener('mousemove', mostrar);
      alvo.removeEventListener('scroll', mostrar);
      alvo.removeEventListener('mouseleave', esconder);
    };
  }, [referencia]);
}
