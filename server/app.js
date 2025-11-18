const express = require('express')
const path = require('path')
const sqlite3 = require('sqlite3').verbose()

const app = express()
const port = 8080;

// paths
const viewsPath = path.join(__dirname, '..', 'views')
const publicPath = path.join(__dirname, '..', 'public')
const dbPath = path.join(__dirname, '..', 'database', 'database.db')

// middlewares
app.use(express.static(publicPath))
app.use(express.urlencoded({ extended: true }))
app.use(express.json())
app.set('views', viewsPath)
app.set('view engine', 'ejs')

// database
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) return console.error(err.message)
  console.log('Conectado ao banco de dados SQLite.')
})

// criação de tabelas
db.run(`CREATE TABLE IF NOT EXISTS usuario (
  id_usuario INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  email TEXT NOT NULL
)`)

db.run(`CREATE TABLE IF NOT EXISTS tarefa (
        id_tarefa INTEGER PRIMARY KEY AUTOINCREMENT,
        id_usuario INTEGER NOT NULL,
        descricao TEXT NOT NULL,
        setor TEXT NOT NULL,
        prioridade TEXT NOT NULL,
        data DATE NOT NULL,
        status TEXT NOT NULL,
        FOREIGN KEY (id_usuario) REFERENCES usuario (id_usuario)
)`) 

// rotas
app.get('/', (req, res) => {
  res.sendFile(path.join(publicPath, 'views', 'cadastroUsuario.html'))
})

app.get('/cadastroTarefa', (req, res) => {
  res.sendFile(path.join(publicPath, 'views', 'cadastroTarefa.html'))
})

app.get('/gerenciamentoTarefa', (req, res) => {
  res.sendFile(path.join(publicPath, 'views', 'gerenciamentoTarefa.html'))
})

app.get('/editarTarefa', (req, res) => {
  res.sendFile(path.join(publicPath, 'views', 'editarTarefa.html'))
})

// criar tarefas
app.get('/tarefa', (req, res) => {
  const sql = `
    SELECT t.*, u.nome AS usuario_nome, u.email AS usuario_email
    FROM tarefa t
    JOIN usuario u ON t.id_usuario = u.id_usuario
  `

  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error(err.message)
      return res.status(500).send("Erro adquirindo tarefas")
    }
    res.json(rows)
  })
})

app.post('/adicionar-tarefa', (req, res) => {
  const descricao = req.body.descricao
  const id_usuario = parseInt(req.body.id_usuario)
  const setor = req.body.setor
  const prioridade = req.body.prioridade
  const data = req.body.data
  const status = 'Pendente'

  if (!descricao || isNaN(id_usuario)) {
    return res.status(400).send("Adicione uma descrição.")
  }

  if (!setor || !prioridade || !data || !status) {
    return res.status(400).send("Informações faltando.")
  }

  db.run('INSERT INTO tarefa(descricao, data, id_usuario, setor, prioridade, status) VALUES(?, ?, ?, ?, ?, ?)', [descricao, data, id_usuario, setor, prioridade, status], (err) => {
    if (err) {
      console.error("Insert error:", err.message)
      return res.status(500).send("Erro ao adicionar tarefa")
    }
    res.redirect(`/gerenciamentoTarefa?id_usuario=${id_usuario}`)
  })
})

// cadastro
app.post('/cadastrar-usuario', (req, res) => {
    const nome = req.body.nome
    const email = req.body.email

    if (!nome || !email) {
        return res.status(400).send("Adicione um nome e um email.")
    }

    db.run('INSERT INTO usuario(nome, email) VALUES(?, ?)', [nome, email], (err) => {
        if (err) {
            console.error("Insert error:", err.message)
            return res.status(500).send("Erro ao adicionar usuario")
        }
        res.redirect('/loginUsuario')
    })
})

// login
app.get('/loginUsuario', (req, res) => {
    res.sendFile(path.join(publicPath, 'views', 'loginUsuario.html'))
})

app.post('/login-usuario', (req, res) => {
    const nome = req.body.nome
    const email = req.body.email

    if (!nome || !email) {
        return res.status(400).send("Adicione um nome e um email.")
    }

    db.get('SELECT * FROM usuario WHERE nome = ? AND email = ?', [nome, email], (err, row) => {
        if (err) {
            console.error("Select error:", err.message)
            return res.status(500).send("Erro ao buscar usuario")
        }

        if (!row) {
            return res.status(401).send("Usuário não encontrado. Faça o cadastro primeiro.")
        }

        res.redirect(`/gerenciamentoTarefa?id_usuario=${row.id_usuario}`)
    })
})

app.get('/usuario/:id', (req, res) => {
    const id_usuario = parseInt(req.params.id)

    if (isNaN(id_usuario)) {
        return res.status(400).send('Parâmetro inválido.')
    }

    db.get('SELECT id_usuario, nome, email FROM usuario WHERE id_usuario = ?', [id_usuario], (err, row) => {
        if (err) {
            console.error('Select error:', err.message)
            return res.status(500).send('Erro ao buscar usuário')
        }

        if (!row) {
            return res.status(404).send('Usuário não encontrado.')
        }

        res.json(row)
    })
})

app.get('/tarefa/:id', (req, res) => {
    const id_tarefa = parseInt(req.params.id)
    const id_usuario = parseInt(req.query.id_usuario)

    if (isNaN(id_tarefa) || isNaN(id_usuario)) {
        return res.status(400).send('Parâmetros inválidos.')
    }

    db.get('SELECT * FROM tarefa WHERE id_tarefa = ? AND id_usuario = ?', [id_tarefa, id_usuario], (err, row) => {
        if (err) {
            console.error('Select error:', err.message)
            return res.status(500).send('Erro ao buscar tarefa')
        }

        if (!row) {
            return res.status(403).send('Você não tem permissão para acessar esta tarefa.')
        }

        res.json(row)
    })
})

// atualizar tarefa
app.post('/atualizar-tarefa', (req, res) => {
    const id_tarefa = parseInt(req.body.id_tarefa)
    const id_usuario = parseInt(req.body.id_usuario)
    const descricao = req.body.descricao
    const setor = req.body.setor
    const prioridade = req.body.prioridade
    const data = req.body.data
    const status = req.body.status

    if (isNaN(id_tarefa) || isNaN(id_usuario)) {
        return res.status(400).send('Parâmetros inválidos.')
    }

    if (!descricao || !setor || !prioridade || !data || !status) {
        return res.status(400).send('Informações faltando.')
    }

    db.run(
        'UPDATE tarefa SET descricao = ?, setor = ?, prioridade = ?, data = ?, status = ? WHERE id_tarefa = ? AND id_usuario = ?',
        [descricao, setor, prioridade, data, status, id_tarefa, id_usuario],
        function (err) {
            if (err) {
                console.error('Update error:', err.message)
                return res.status(500).send('Erro ao atualizar tarefa')
            }

            if (this.changes === 0) {
                return res.status(403).send('Você não tem permissão para alterar esta tarefa.')
            }

            res.redirect(`/gerenciamentoTarefa?id_usuario=${id_usuario}`)
        }
    )
})

// deletar tarefa
app.post('/deletar-tarefa', (req, res) => {
    const id_tarefa = parseInt(req.body.id_tarefa)
    const id_usuario = parseInt(req.body.id_usuario)

    if (isNaN(id_tarefa) || isNaN(id_usuario)) {
        return res.status(400).send('Parâmetros inválidos.')
    }

    db.run(
        'DELETE FROM tarefa WHERE id_tarefa = ? AND id_usuario = ?',
        [id_tarefa, id_usuario],
        function (err) {
            if (err) {
                console.error('Delete error:', err.message)
                return res.status(500).send('Erro ao excluir tarefa')
            }

            if (this.changes === 0) {
                return res.status(403).send('Você não tem permissão para excluir esta tarefa.')
            }

            res.redirect(`/gerenciamentoTarefa?id_usuario=${id_usuario}`)
        }
    )
})

app.listen(port, () => {
    console.log(`Servidor ouvindo em: http://localhost:${port}`)
})
