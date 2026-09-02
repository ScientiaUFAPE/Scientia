import { describe, expect, it } from 'vitest';

import { juntarNomes, percentualRelativo, periodoDosAnos } from '../utils/acervo.js';

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
});
