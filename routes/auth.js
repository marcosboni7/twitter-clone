const express = require('express');
const bcrypt = require('bcrypt');
const db = require('../config/db');
const router = express.Router();
const flash = require('connect-flash');
const multer = require('multer');
const path = require('path');

// Configuração do multer para upload de arquivos
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/'); // Diretório para armazenar as imagens
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname)); // Renomeia o arquivo com timestamp
    }
});

const upload = multer({ storage });

// Usar flash messages
router.use(flash());

// Rota para a página de registro
router.get('/register', (req, res) => {
    res.render('register', { message: req.flash('error') || '' });
});

// Rota para registrar um novo usuário
router.post('/register', async (req, res) => {
    const { username, password } = req.body;
    const existingUser = await db.query('SELECT * FROM users WHERE username = $1', [username]);

    if (existingUser.rows.length > 0) {
        req.flash('error', 'Nome de usuário já está em uso. Tente outro.');
        return res.redirect('/register');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    try {
        await db.query('INSERT INTO users (username, password, badge_url) VALUES ($1, $2, $3)', [
            username,
            hashedPassword,
            'https://media.discordapp.net/attachments/1186770965066158140/1295403752198504580/68014925-4ee6-4fcf-9960-8d98beeb8fc8_1.png?ex=670e8641&is=670d34c1&hm=5704c7160b8ae594b2e0b82f5392032225bf9dc18d097d9c776edede54aba3c6&=&format=webp&quality=lossless&width=395&height=395'
        ]);

        req.flash('success', 'Você acaba de ganhar um emblema de registro antecipado! Agora faça login.');
        res.redirect('/login?registered=true'); // Adicione um parâmetro na query string para sinalizar o sucesso
    } catch (err) {
        console.error('Erro ao registrar:', err);
        req.flash('error', 'Erro ao registrar! Tente novamente.');
        res.redirect('/register');
    }
});

// Rota para a página de login
router.get('/login', (req, res) => {
    res.render('login', { message: req.flash('error') || '' });
});

// Rota para fazer login
router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const result = await db.query('SELECT * FROM users WHERE username = $1', [username]);

    if (result.rows.length > 0) {
        const user = result.rows[0];
        const match = await bcrypt.compare(password, user.password);

        if (match) {
            req.session.userId = user.id;
            req.session.username = user.username;
            req.flash('success', 'Você acabou de ganhar um emblema de registro antecipado!');
            return res.redirect('/'); // Redireciona para a página inicial após login
        }
    }

    req.flash('error', 'Nome de usuário ou senha incorretos.');
    res.redirect('/login');
});

// Rota para atualizar imagens de perfil e banner
router.post('/update-images', upload.fields([{ name: 'profile_picture' }, { name: 'banner_image' }]), async (req, res) => {
    const userId = req.session.userId;
    const profilePicture = req.files.profile_picture ? req.files.profile_picture[0].filename : null;
    const bannerImage = req.files.banner_image ? req.files.banner_image[0].filename : null;

    try {
        await db.query('UPDATE users SET profile_picture = $1, banner_image = $2 WHERE id = $3', [profilePicture, bannerImage, userId]);
        req.flash('success', 'Imagens atualizadas com sucesso!');
        res.redirect('/profile');
    } catch (err) {
        console.error('Erro ao atualizar imagens:', err);
        req.flash('error', 'Erro ao atualizar as imagens. Tente novamente.');
        res.redirect('/profile');
    }
});

// Rota para a página de perfil
router.get('/profile', async (req, res) => {
    if (!req.session.userId) {
        return res.redirect('/login');
    }

    try {
        const result = await db.query('SELECT * FROM users WHERE id = $1', [req.session.userId]);
        const user = result.rows[0];

        if (!user) {
            return res.redirect('/login');
        }

        // Verifica se o usuário tem emblema
        const hasEmblem = true; // Aqui você pode implementar a lógica para determinar se o usuário possui um emblema

        // Adiciona uma consulta para trazer os posts do usuário
        const posts = await db.query('SELECT * FROM posts WHERE user_id = $1 ORDER BY created_at DESC', [user.id]);

        // Conta o total de usuários
        const totalUsersResult = await db.query('SELECT COUNT(*) FROM users');
        const totalUsers = totalUsersResult.rows[0].count;

        // Passa a variável message junto com os dados do usuário, posts e total de usuários
        res.render('profile', { user, posts: posts.rows, hasEmblem, message: req.flash('success') || '', totalUsers });
    } catch (err) {
        console.error('Erro ao buscar perfil:', err);
        req.flash('error', 'Erro ao carregar perfil. Tente novamente.');
        res.redirect('/');
    }
});

// Rota para criar um novo post
router.post('/posts', upload.single('image'), async (req, res) => {
    const userId = req.session.userId;
    const title = req.body.title;
    const content = req.body.content;
    const image = req.file ? req.file.filename : null;
    const createdAt = new Date(); // Adicionando a data de criação

    if (!title || title.trim() === "" || !content || content.trim() === "") {
        req.flash('error', 'Título e conteúdo são obrigatórios.');
        return res.redirect('/'); // Redireciona de volta para a página inicial em caso de erro
    }

    try {
        await db.query('INSERT INTO posts (user_id, title, content, image, created_at) VALUES ($1, $2, $3, $4, $5)', [
            userId,
            title,
            content,
            image,
            createdAt
        ]);
        req.flash('success', 'Post criado com sucesso!');
        res.redirect('/'); // Redireciona para a página inicial após criar o post
    } catch (err) {
        console.error('Erro ao criar post:', err);
        req.flash('error', 'Erro ao criar post. Tente novamente.');
        res.redirect('/'); // Redireciona de volta para a página inicial em caso de erro
    }
});

// Rota para curtir um post
router.post('/posts/:postId/like', async (req, res) => {
    const postId = req.params.postId;
    const userId = req.session.userId;

    try {
        // Verifica se o usuário já curtiu o post
        const existingLike = await db.query('SELECT * FROM likes WHERE post_id = $1 AND user_id = $2', [postId, userId]);

        if (existingLike.rows.length > 0) {
            return res.status(400).json({ message: 'Você já curtiu este post.' });
        }

        // Insere o novo like
        await db.query('INSERT INTO likes (post_id, user_id) VALUES ($1, $2)', [postId, userId]);

        // Obtém a nova contagem de likes
        const countResult = await db.query('SELECT COUNT(*) FROM likes WHERE post_id = $1', [postId]);
        const likeCount = countResult.rows[0].count;

        res.status(201).json({ message: 'Post curtido com sucesso!', likeCount });
    } catch (err) {
        console.error('Erro ao curtir post:', err);
        res.status(500).json({ message: 'Erro ao curtir post. Tente novamente.' });
    }
});

// Rota para adicionar comentários a um post específico
router.post('/posts/:postId/comments', async (req, res) => {
    const postId = req.params.postId;
    const userId = req.session.userId;
    const { content } = req.body;

    if (!userId) {
        return res.status(401).send('Usuário não está autenticado');
    }

    if (!content || content.trim() === "") {
        req.flash('error', 'O conteúdo do comentário é obrigatório.');
        return res.redirect(`/posts/${postId}`); // Redireciona para a página do post após falha
    }

    try {
        await db.query('INSERT INTO comments (post_id, user_id, content) VALUES ($1, $2, $3)', [postId, userId, content]);

        req.flash('success', 'Comentário adicionado com sucesso!');
        res.redirect('/'); // Redireciona para a página inicial após sucesso
    } catch (err) {
        console.error('Erro ao adicionar comentário:', err);
        req.flash('error', 'Erro ao adicionar comentário. Tente novamente.');
        res.redirect('/'); // Redireciona de volta para a página inicial em caso de erro
    }
});

// Rota para exibir um post específico e seus comentários
router.get('/posts/:id', async (req, res) => {
    try {
        const postId = req.params.id;

        const postResult = await db.query('SELECT * FROM posts WHERE id = $1', [postId]);
        const post = postResult.rows[0];

        if (!post) {
            return res.status(404).send('Post não encontrado');
        }

        const commentsResult = await db.query('SELECT * FROM comments WHERE post_id = $1 ORDER BY created_at ASC', [postId]);
        const comments = commentsResult.rows;

        res.render('post', { post, comments });
    } catch (err) {
        console.error('Erro ao buscar post:', err);
        res.status(500).send('Erro ao buscar post. Tente novamente.');
    }
});

// Rota para obter a quantidade de likes de um post
router.get('/posts/:postId/likes', async (req, res) => {
    const postId = req.params.postId;

    try {
        const countResult = await db.query('SELECT COUNT(*) FROM likes WHERE post_id = $1', [postId]);
        const likeCount = countResult.rows[0].count;

        res.status(200).json({ likeCount });
    } catch (err) {
        console.error('Erro ao obter contagem de likes:', err);
        res.status(500).send('Erro ao obter contagem de likes. Tente novamente.');
    }
});

// Rota para obter a contagem total de usuários
router.get('/user-count', async (req, res) => {
    try {
        const countResult = await db.query('SELECT COUNT(*) FROM users');
        const userCount = countResult.rows[0].count;

        res.status(200).json({ userCount });
    } catch (err) {
        console.error('Erro ao obter contagem de usuários:', err);
        res.status(500).send('Erro ao obter contagem de usuários. Tente novamente.');
    }
});

module.exports = router;
