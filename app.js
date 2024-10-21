const express = require('express');
const session = require('express-session');
const flash = require('connect-flash');
const db = require('./config/db'); // Caminho para a configuração do banco de dados
const authRoutes = require('./routes/auth'); // Importando rotas de autenticação

const app = express();

// Configurações do Express
app.set('view engine', 'ejs'); // Define o EJS como motor de template
app.use(express.urlencoded({ extended: true })); // Para analisar dados de formulários
app.use(express.static('public')); // Serve arquivos estáticos da pasta 'public'
app.use('/uploads', express.static('uploads')); // Serve arquivos estáticos da pasta 'uploads'

// Configuração da sessão
app.use(session({
    secret: process.env.SESSION_SECRET || 'seu_segredo_aqui', // Utilize variáveis de ambiente em produção
    resave: false,
    saveUninitialized: true,
}));

app.use(flash()); // Usando flash para mensagens

// Middleware para passar mensagens flash para as views
app.use((req, res, next) => {
    res.locals.error = req.flash('error'); // Mensagens de erro
    res.locals.success = req.flash('success'); // Mensagens de sucesso
    next();
});

// Rota para a página inicial
app.get('/', async (req, res) => {
    // Verifica se o usuário está logado
    if (!req.session.userId) {
        return res.redirect('/login'); // Redireciona para a página de login
    }

    try {
        // Buscar informações do usuário logado
        const userResult = await db.query('SELECT * FROM users WHERE id = $1', [req.session.userId]);
        const user = userResult.rows[0];

        if (!user) {
            return res.redirect('/login'); // Redireciona se o usuário não for encontrado
        }

        console.log('Usuário logado:', user); // Verificando os dados do usuário

        // Buscar posts (com os dados de quem postou) e comentários
        const postsResult = await db.query(`
            SELECT posts.*, 
                   users.username AS post_username, 
                   users.profile_picture AS post_profile_picture, 
                   comments.content AS comment_content, 
                   comments.user_id AS comment_user_id,
                   COALESCE(comment_users.username, 'Anônimo') AS comment_username, 
                   comment_users.profile_picture AS comment_profile_picture
            FROM posts
            LEFT JOIN users ON posts.user_id = users.id
            LEFT JOIN comments ON comments.post_id = posts.id
            LEFT JOIN users AS comment_users ON comments.user_id = comment_users.id
            ORDER BY posts.created_at DESC;
        `);

        console.log('Posts e comentários:', postsResult.rows); // Verificando os dados dos posts e comentários

        // Agrupar comentários por post
        const posts = postsResult.rows.reduce((acc, post) => {
            let existingPost = acc.find(p => p.id === post.id);
            if (!existingPost) {
                existingPost = { 
                    ...post, 
                    comments: [] 
                };
                acc.push(existingPost);
            }

            // Adiciona o comentário ao post se existir
            if (post.comment_content) {
                existingPost.comments.push({
                    content: post.comment_content,
                    user_id: post.comment_user_id,
                    username: post.comment_username,
                    profile_picture: post.comment_profile_picture
                });
            }

            return acc;
        }, []);

        console.log('Posts agrupados:', posts); // Verificando os posts agrupados

        res.render('index', { user, posts }); // Renderiza a página inicial com o usuário e os posts
    } catch (err) {
        console.error('Erro ao buscar usuário ou posts:', err);
        req.flash('error', 'Erro ao carregar a página. Tente novamente mais tarde.');
        res.redirect('/login');
    }
});

// Usando as rotas de autenticação (login, registro, perfil, etc.)
app.use(authRoutes);

// Iniciar o servidor
app.listen(3000, () => {
    console.log('Servidor rodando na porta 3000');
});
