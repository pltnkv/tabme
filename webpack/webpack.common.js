const path = require("path");
const CopyPlugin = require("copy-webpack-plugin");
const srcDir = path.join(__dirname, "..", "src");
const webpack = require("webpack");

module.exports.getCommonConfig = (env) => {
  const override_newtab = env.BUILD_TYPE !== "overrideless";
  const manifestFrom = override_newtab ? "manifest-normal.json" : "manifest-overrideless.json";
  console.log('override_newtab', override_newtab, manifestFrom)
  return {
    entry: {
      // popup: path.join(srcDir, "popup.tsx"),
      newtab: path.join(srcDir, "newtab/newtab.tsx"),
      // options: path.join(srcDir, "options.tsx"),
      background: path.join(srcDir, "background.ts")
      // content_script: path.join(srcDir, "content_script.tsx"),
    },
    output: {
      path: path.join(__dirname, "../dist/js"),
      filename: "[name].js"
    },
    optimization: {
      splitChunks: {
        name: "vendor",
        chunks: "initial"
      }
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: "ts-loader",
          exclude: /node_modules/
        }
      ]
    },
    resolve: {
      // modules: [
      //     path.join(__dirname, "./node_modules"),
      //     path.join(__dirname, "./"),
      // ],
      extensions: [".ts", ".tsx", ".js"]
    },
    plugins: [
      new CopyPlugin({
        patterns: [
          { from: ".", to: "../", context: "public" },
          {
            from: `./public/${manifestFrom}`,
            to() {
              // FILENAME_REGEX is a regex that matches the file you are looking for...
              return `../manifest.json`;
            }
          }
        ],
        options: {}
      }),
      new webpack.DefinePlugin({
        "__OVERRIDE_NEWTAB": JSON.stringify(override_newtab)
      })
    ]
  };
};
