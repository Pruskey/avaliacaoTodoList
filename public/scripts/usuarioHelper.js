// buscar
async function buscarUsuarioPorId(idUsuario) {
    const resposta = await fetch(`/usuario/${encodeURIComponent(idUsuario)}`);
    if (!resposta.ok) {
        throw new Error('Erro ao buscar usuário');
    }
    return resposta.json();
}
