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

app.get('/tarefa', (req, res) => {
  db.all('SELECT * FROM tarefa', [], (err, rows) => {
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
    res.redirect('/gerenciamentoTarefa')
  })
})

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

        res.redirect(`/cadastroTarefa?id_usuario=${row.id_usuario}`)
    })
})

app.listen(port, () => {
    console.log(`Servidor ouvindo em: http://localhost:${port}`)
})
