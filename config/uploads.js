const multer = require('multer');
const path = require('path');

// Configuração do multer para armazenar arquivos na pasta 'uploads'
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname)); // Ex: 1234567890-12345.png
    }
});

const upload = multer({ storage: storage });

module.exports = upload;
