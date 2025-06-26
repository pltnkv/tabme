const path = require("path");
const CopyPlugin = require("copy-webpack-plugin");
const srcDir = path.join(__dirname, "..", "src");
const webpack = require("webpack");
const Dotenv = require("dotenv-webpack");

module.exports.getCommonConfig = (env) => {
  const override_newtab = env.BUILD_TYPE !== "overrideless";
  console.log("override_newtab", override_newtab);
  const publicFolder = override_newtab ? "public-newtab" : "public-mini";

  return {
    entry: {
      popup: path.join(srcDir, "popup/popup.tsx"),
      sidebar: path.join(srcDir, "sidebar/sidebar.tsx"),
      newtab: path.join(srcDir, "newtab/newtab.tsx"),
      // options: path.join(srcDir, "options.tsx"),
      background: path.join(srcDir, "background/background.ts")
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
        },
        {
          test: /\.svg$/, // Add this rule for SVG files
          use: ["@svgr/webpack"]
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
          { from: ".", to: "../", context: publicFolder }
        ],
        options: {}
      }),
      new Dotenv(), // Load .env variables
      new webpack.DefinePlugin({
        "__OVERRIDE_NEWTAB": JSON.stringify(override_newtab)
      })
    ]
  };
};
