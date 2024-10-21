const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/database'); // ajuste o caminho se necessário

class Post extends Model {}

Post.init({
    content: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    // outros atributos conforme necessário
}, {
    sequelize,
    modelName: 'Post',
});

module.exports = Post;
