jest.mock('../../src/models/usuarioModel');

const usuarioModel = require('../../src/models/usuarioModel');
const usuariosService = require('../../src/services/usuariosService');

beforeEach(() => {
  jest.clearAllMocks();
});

describe('criarUsuario', () => {
  it('cria usuário com senha hasheada (nunca em texto puro)', async () => {
    usuarioModel.buscarPorEmail.mockResolvedValue(null);
    usuarioModel.criar.mockResolvedValue(1);

    const usuario = await usuariosService.criarUsuario({
      nome: 'Ana',
      email: 'ana@teste.com',
      senha: 'segredo123',
    });

    expect(usuario).toEqual({ id: 1, nome: 'Ana', email: 'ana@teste.com' });

    const argsChamados = usuarioModel.criar.mock.calls[0][0];
    expect(argsChamados.senhaHash).toBeDefined();
    expect(argsChamados.senhaHash).toContain(':');
    expect(argsChamados.senhaHash).not.toContain('segredo123');
  });

  it('rejeita e-mail já cadastrado com 409', async () => {
    usuarioModel.buscarPorEmail.mockResolvedValue({ id: 5 });

    await expect(
      usuariosService.criarUsuario({ nome: 'Ana', email: 'ana@teste.com', senha: 'segredo123' })
    ).rejects.toMatchObject({ status: 409 });

    expect(usuarioModel.criar).not.toHaveBeenCalled();
  });
});

describe('obterUsuarioPorId', () => {
  it('lança 404 quando usuário não existe', async () => {
    usuarioModel.buscarPorId.mockResolvedValue(null);

    await expect(usuariosService.obterUsuarioPorId(123)).rejects.toMatchObject({ status: 404 });
  });

  it('lança 400 quando o id não é numérico', async () => {
    await expect(usuariosService.obterUsuarioPorId('abc')).rejects.toMatchObject({ status: 400 });
  });

  it('retorna o usuário quando encontrado', async () => {
    usuarioModel.buscarPorId.mockResolvedValue({ id: 1, nome: 'Ana', email: 'ana@teste.com' });

    await expect(usuariosService.obterUsuarioPorId(1)).resolves.toEqual({
      id: 1,
      nome: 'Ana',
      email: 'ana@teste.com',
    });
  });
});

describe('hashSenha', () => {
  it('gera hashes diferentes para a mesma senha (salt aleatório)', () => {
    const hash1 = usuariosService.hashSenha('mesmaSenha');
    const hash2 = usuariosService.hashSenha('mesmaSenha');

    expect(hash1).not.toEqual(hash2);
  });
});
