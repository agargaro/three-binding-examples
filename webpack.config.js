const path = require('path');

module.exports = {
    mode: 'none',
    entry: './src/arkanoid.ts',
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'arkanoid.js'
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.js', '.jsx']
    },
    module: {
        rules: [
            {
                use: 'ts-loader',
                exclude: /node_modules/,
            }
        ]
    }
};