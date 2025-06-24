const merge = require('webpack-merge');
const { getCommonConfig } = require("./webpack.common");

module.exports = (env) => merge(getCommonConfig(env), {
    mode: 'production',
});