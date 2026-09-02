import { describe, expect, it } from 'vitest';

import { juntarNomes, montarAgora, percentualRelativo, periodoDosAnos } from '../utils/acervo.js';

function listaDe(tamanho, prefixo) {
  return Array.from({ length: tamanho }, (_, indice) => ({ id: `${prefixo}${indice + 1}` }));
}

describe('Cálculos da visão geral', () => {
  it('resume o período pelo primeiro e pelo último ano cadastrados', () => {
    expect(periodoDosAnos([{ ano: 2015 }, { ano: 2020 }, { ano: 2026 }])).toBe('2015–2026');
    expect(periodoDosAnos([{ ano: 2024 }])).toBe('2024');
    expect(periodoDosAnos([])).toBe('');
  });

  it('não depende da ordem em que os anos chegam', () => {
    expect(periodoDosAnos([{ ano: 2026 }, { ano: 2015 }])).toBe('2015–2026');
  });

  it('mede a barra pelo maior valor da série e protege a divisão por zero', () => {
    expect(percentualRelativo(52, 52)).toBe(100);
    expect(percentualRelativo(28, 52)).toBe(54);
    expect(percentualRelativo(0, 0)).toBe(0);
  });

  it('junta os nomes das áreas em destaque com "e" no último', () => {
    expect(juntarNomes([])).toBe('');
    expect(juntarNomes(['Engenharia de Software'])).toBe('Engenharia de Software');
    expect(juntarNomes(['Engenharia de Software', 'Inteligência Artificial'])).toBe(
      'Engenharia de Software e Inteligência Artificial',
    );
    expect(juntarNomes(['Redes', 'Banco de Dados', 'Bioinformática'])).toBe(
      'Redes, Banco de Dados e Bioinformática',
    );
  });

  it('em "Agora", prioriza até três vagas e completa com editais até o limite', () => {
    const cincoVagas = listaDe(5, 'vaga-');
    const cincoEditais = listaDe(5, 'edital-');

    expect(montarAgora(cincoVagas, cincoEditais)).toEqual({
      vagas: cincoVagas.slice(0, 3),
      editais: cincoEditais.slice(0, 2),
    });
  });

  it('com poucas vagas, os editais preenchem o restante das cinco posições', () => {
    const umaVaga = listaDe(1, 'vaga-');
    const seisEditais = listaDe(6, 'edital-');

    expect(montarAgora(umaVaga, seisEditais)).toEqual({
      vagas: umaVaga,
      editais: seisEditais.slice(0, 4),
    });
  });

  it('sem vagas abertas, os editais ocupam as cinco posições', () => {
    const cincoEditais = listaDe(5, 'edital-');

    expect(montarAgora([], cincoEditais)).toEqual({
      vagas: [],
      editais: cincoEditais,
    });
  });

  it('sem editais suficientes, a lista fica com menos de cinco itens', () => {
    const duasVagas = listaDe(2, 'vaga-');
    const umEdital = listaDe(1, 'edital-');

    expect(montarAgora(duasVagas, umEdital)).toEqual({
      vagas: duasVagas,
      editais: umEdital,
    });
  });
});
