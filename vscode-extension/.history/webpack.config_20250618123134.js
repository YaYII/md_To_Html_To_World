/**
 * @description webpack配置文件
 */
const path = require('path');

module.exports = {
  target: 'node',
  mode: 'production',
  entry: './src/extension.ts',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'extension.js',
    libraryTarget: 'commonjs2',
    devtoolModuleFilenameTemplate: '../[resource-path]'
  },
  devtool: 'source-map',
  externals: {
    vscode: 'commonjs vscode', // vscode模块不打包
    // 排除一些不需要打包的Node.js核心模块
    'fs': 'commonjs fs',
    'path': 'commonjs path',
    'os': 'commonjs os',
    'child_process': 'commonjs child_process',
    // 排除sharp库，避免打包时的警告
    'sharp': 'commonjs sharp'
  },
  resolve: {
    extensions: ['.ts', '.js']
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'ts-loader'
          }
        ]
      }
    ]
  },
  // 添加Node.js模块的处理
  node: {
    __dirname: false,
    __filename: false
  }
}; 