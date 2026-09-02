import * as repositorioEditais from '../models/repositorioEditais.js';
import { validarEnumOpcional } from './consultaParametrosService.js';

const COM_PROJETOS_VALORES = ['1', 'true'];

export async function listar(filtros = {}) {
  const comProjetos = validarEnumOpcional(
    filtros.comProjetos,
    COM_PROJETOS_VALORES,
    'O parâmetro comProjetos deve ser 1 ou true.',
  );

  return repositorioEditais.listarTodos({ comProjetos: comProjetos !== undefined });
}
