jest.mock('../../src/models/usuarioModel');

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const usuarioModel = require('../../src/models/usuarioModel');
const authService = require('../../src/services/authService');

const SEGREDO = 'segredo-de-teste';

beforeEach(() => {
  jest.clearAllMocks();
  process.env.JWT_SECRET = SEGREDO;
});

describe('registrar', () => {
  it.each([
    ['curto demais', 'ab'],
    ['com espaço', 'ana maria'],
    ['com caractere inválido', 'ana@teste'],
    ['ausente', undefined],
  ])('rejeita usuário %s com 400', async (_, usuario) => {
    await expect(authService.registrar({ usuario, senha: 'senha123' })).rejects.toMatchObject({ status: 400 });
    expect(usuarioModel.criar).not.toHaveBeenCalled();
  });

  it('rejeita senha com menos de 6 caracteres', async () => {
    await expect(authService.registrar({ usuario: 'ana', senha: '12345' })).rejects.toMatchObject({ status: 400 });
  });

  it('rejeita com 409 quando o usuário já existe', async () => {
    usuarioModel.buscarPorUsuario.mockResolvedValue({ id: 1, usuario: 'ana' });

    await expect(authService.registrar({ usuario: 'ana', senha: 'senha123' })).rejects.toMatchObject({ status: 409 });
    expect(usuarioModel.criar).not.toHaveBeenCalled();
  });

  it('cria o usuário guardando apenas o hash da senha', async () => {
    usuarioModel.buscarPorUsuario.mockResolvedValue(null);
    usuarioModel.criar.mockResolvedValue(7);

    const resultado = await authService.registrar({ usuario: 'ana', senha: 'senha123' });

    expect(resultado).toEqual({ id: 7, usuario: 'ana' });
    const { senhaHash } = usuarioModel.criar.mock.calls[0][0];
    expect(senhaHash).not.toBe('senha123');
    await expect(bcrypt.compare('senha123', senhaHash)).resolves.toBe(true);
  });
});

describe('login', () => {
  let senhaHash;

  beforeAll(async () => {
    senhaHash = await bcrypt.hash('senha123', 4);
  });

  it('rejeita com 400 quando faltam usuário ou senha', async () => {
    await expect(authService.login({ usuario: 'ana' })).rejects.toMatchObject({ status: 400 });
  });

  it('rejeita com 401 quando o usuário não existe', async () => {
    usuarioModel.buscarPorUsuario.mockResolvedValue(null);

    await expect(authService.login({ usuario: 'ana', senha: 'senha123' })).rejects.toMatchObject({ status: 401 });
  });

  it('rejeita com 401 quando a senha está errada', async () => {
    usuarioModel.buscarPorUsuario.mockResolvedValue({ id: 7, usuario: 'ana', senha_hash: senhaHash });

    await expect(authService.login({ usuario: 'ana', senha: 'errada' })).rejects.toMatchObject({ status: 401 });
  });

  it('devolve um token válido com id e usuário', async () => {
    usuarioModel.buscarPorUsuario.mockResolvedValue({ id: 7, usuario: 'ana', senha_hash: senhaHash });

    const resultado = await authService.login({ usuario: 'ana', senha: 'senha123' });

    expect(resultado.usuario).toEqual({ id: 7, usuario: 'ana' });
    expect(jwt.verify(resultado.token, SEGREDO)).toMatchObject({ id: 7, usuario: 'ana' });
  });

  it('falha com erro interno (não operacional) quando JWT_SECRET não está configurado', async () => {
    delete process.env.JWT_SECRET;
    usuarioModel.buscarPorUsuario.mockResolvedValue({ id: 7, usuario: 'ana', senha_hash: senhaHash });

    const erro = await authService.login({ usuario: 'ana', senha: 'senha123' }).catch((e) => e);
    expect(erro).toBeInstanceOf(Error);
    expect(erro.isOperational).toBeUndefined();
  });
});
