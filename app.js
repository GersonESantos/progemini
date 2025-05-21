// Importar Express
const express = require('express');
const { engine } = require('express-handlebars'); // Importa a engine do Handlebars
const { MongoClient } = require('mongodb');
const cors = require('cors');
const path = require('path'); // Módulo path para lidar com caminhos de arquivos

// Criar app
const app = express();

// --- Configuração do Handlebars ---
app.engine('handlebars', engine({
    defaultLayout: 'main', // Define um layout principal (opcional, mas recomendado)
    layoutsDir: path.join(__dirname, 'views/layouts'), // Diretório para os layouts
    partialsDir: path.join(__dirname, 'views/partials'), // Diretório para partials (opcional)
    helpers: { // Helpers customizados para o Handlebars (opcional)
        formatarPreco: function (preco) {
            if (typeof preco === 'number') {
                // Assume que o preço está em centavos
                return (preco / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            }
            return 'Preço inválido';
        }
    }
}));
app.set('view engine', 'handlebars'); // Define Handlebars como o motor de visualização
app.set('views', path.join(__dirname, 'views')); // Especifica o diretório onde os arquivos de template (.handlebars) estão

// --- Middlewares ---
app.use(express.json()); // Para parsear JSON no corpo das requisições
app.use(express.urlencoded({ extended: true })); // Para parsear dados de formulários
app.use(cors()); // Habilita CORS para permitir requisições de diferentes origens

// Servir arquivos estáticos (CSS, JS, imagens da pasta 'public')
app.use(express.static(path.join(__dirname, 'public')));


// --- Conexão com o MongoDB Atlas ---
const uri = 'mongodb+srv://gebhsantos:A3YG8lXShNUS7FUw@users.vnnwl.mongodb.net/users?retryWrites=true&w=majority&appName=users';
const client = new MongoClient(uri);
let produtosCollection;

async function conectarMongoDB() {
  try {
    await client.connect();
    const db = client.db('produtosDB'); // Nome do seu banco de dados
    produtosCollection = db.collection('produtos'); // Nome da sua coleção
    console.log('Conectado ao MongoDB com sucesso!');
  } catch (err) {
    console.error('Erro ao conectar ao MongoDB:', err);
    process.exit(1); // Encerra a aplicação se não conseguir conectar ao DB
  }
}

conectarMongoDB(); // Chama a função para conectar ao iniciar o servidor

// --- Rotas ---

// Rota para listar todos os produtos (renderiza com Handlebars)
app.get('/', async (req, res) => {
  try {
    if (!produtosCollection) {
      // Adiciona uma pequena espera caso a conexão ainda não esteja estabelecida
      // Isso é uma solução simples; em produção, pode ser necessário um tratamento mais robusto
      await new Promise(resolve => setTimeout(resolve, 500));
      if (!produtosCollection) {
          return res.status(503).send('Serviço indisponível, tente novamente em alguns instantes.');
      }
    }
    const produtos = await produtosCollection.find().toArray();
    // Renderiza o template 'lista-produtos.handlebars'
    // e passa os dados dos produtos para ele
    res.render('lista-produtos', {
        tituloDaPagina: 'Nossos Produtos', // Um exemplo de dado extra para o template
        produtos: produtos, // A lista de produtos do banco
        layout: 'main' // Especifica qual layout usar (se defaultLayout não estiver configurado ou quiser sobrescrever)
    });
  } catch (err) {
    console.error('Erro ao buscar produtos para renderização:', err);
    res.status(500).send('Erro ao buscar produtos. Tente novamente mais tarde.');
  }
});

// Rota para criar um novo produto (exemplo, se você tiver um formulário)
app.post('/produtos', async (req, res) => {
  try {
    if (!produtosCollection) {
        return res.status(503).send('Serviço indisponível, não é possível adicionar produto.');
    }
    const { nome, preco } = req.body;

    // Validação simples
    if (!nome || preco === undefined) {
      return res.status(400).json({ erro: 'Nome e preço são obrigatórios.' });
    }

    const precoNumerico = Number(preco);
    if (isNaN(precoNumerico)) {
        return res.status(400).json({ erro: 'Preço deve ser um número.' });
    }

    // Assume que o preço é enviado em Reais e guardamos em centavos
    const resultado = await produtosCollection.insertOne({ nome, preco: Math.round(precoNumerico * 100) });
    // res.status(201).json({ id: resultado.insertedId, nome, preco: Math.round(precoNumerico * 100) });
    res.redirect('/'); // Redireciona para a lista após adicionar
  } catch (err) {
    console.error('Erro ao salvar produto:', err);
    res.status(500).json({ erro: 'Erro ao salvar produto', detalhes: err.message });
  }
});

// --- Iniciar o Servidor ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  console.log(`Acesse em http://localhost:${PORT}`);
});
