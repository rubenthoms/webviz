const InterpolateHtmlPlugin = require("react-dev-utils/InterpolateHtmlPlugin");
const CssMinimizerPlugin = require("css-minimizer-webpack-plugin");
const ESLintPlugin = require("eslint-webpack-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const path = require("path");
const fs = require("fs");
const webpack = require("webpack");
const TerserPlugin = require("terser-webpack-plugin");
const TsConfigPathsPlugin = require("tsconfig-paths-webpack-plugin");
const getPublicUrlOrPath = require("react-dev-utils/getPublicUrlOrPath");

const NODE_ENV = process.env.NODE_ENV;
if (!NODE_ENV) {
    throw new Error("The NODE_ENV environment variable is required but was not specified.");
}

const isProduction = NODE_ENV === "production";
const isDevelopment = !isProduction;

const appDirectory = fs.realpathSync(process.cwd());
const resolveApp = (relativePath) => path.resolve(appDirectory, relativePath);

const appPaths = {
    appBuild: resolveApp("webpack-dist"),
    appPublic: resolveApp("public"),
    appHtml: resolveApp("public/index.html"),
    appIndexJs: resolveApp("src/main.tsx"),
    appSrc: resolveApp("src"),
    appNodeModules: resolveApp("node_modules"),
    appPath: resolveApp("."),
};

const publicUrlOrPath = getPublicUrlOrPath(
    process.env.NODE_ENV === "development",
    /* eslint-disable-next-line import/no-dynamic-require */
    require(resolveApp("package.json")).homepage,
    process.env.PUBLIC_URL
);

module.exports = () => {
    const config = {
        name: "main",
        entry: appPaths.appIndexJs,
        mode: isProduction ? "production" : "development",
        target: "web",
        devtool: isProduction ? "source-map" : "cheap-module-source-map",
        output: {
            path: appPaths.appBuild,
            filename: "static/js/[name].bundle.js",
            publicPath: publicUrlOrPath,
            chunkFilename: isProduction ? "static/js/[name].[contenthash:8].chunk.js" : "static/js/[name].chunk.js",
            assetModuleFilename: "static/media/[name].[hash].[ext]",
        },
        module: {
            rules: [
                {
                    oneOf: [
                        // "url" loader works like "file" loader except that it embeds assets
                        // smaller than specified limit in bytes as data URLs to avoid requests.
                        // A missing `test` is equivalent to a match.
                        {
                            test: [/\.bmp$/, /\.gif$/, /\.jpe?g$/, /\.png$/],
                            type: "asset",
                            parser: {
                                dataUrlCondition: {
                                    maxSize: 10000,
                                },
                            },
                        },
                        {
                            test: /\.svg$/,
                            use: [
                                {
                                    loader: require.resolve("@svgr/webpack"),
                                    options: {
                                        prettier: true, // Use prettier to format JavaScript output
                                        svgo: false, // Don't use SVGO to optimize SVGs as it might break icons
                                        titleProp: true,
                                        ref: true,
                                    },
                                },
                                {
                                    loader: require.resolve("file-loader"),
                                    options: {
                                        name: "static/media/[name].[hash].[ext]",
                                    },
                                },
                            ],
                            issuer: {
                                and: [/\.(ts|tsx|js|jsx)$/],
                            },
                        },
                        {
                            test: /\.(ts|tsx|js|jsx)$/,
                            include: [appPaths.appSrc],
                            use: [
                                {
                                    loader: require.resolve("babel-loader"),
                                    options: {
                                        customize: require.resolve("babel-preset-react-app/webpack-overrides"),
                                        presets: [
                                            require.resolve("babel-preset-react-app", [
                                                "@babel/preset-react",
                                                { runtime: "automatic" },
                                            ]),
                                        ],
                                        cacheDirectory: true,
                                        cacheCompression: isProduction,
                                        compact: isProduction,
                                    },
                                },
                            ],
                        },
                        {
                            test: /\.(ts|tsx|js|jsx)$/,
                            include: [appPaths.appNodeModules],
                            use: ["webpack-conditional-loader"],
                        },
                        {
                            test: /\.css$/i,
                            include: [appPaths.appSrc, appPaths.appNodeModules],
                            use: ["style-loader", "css-loader", "postcss-loader"],
                        },
                    ],
                },
            ],
        },
        resolve: {
            plugins: [new TsConfigPathsPlugin()],
            extensions: [".tsx", ".ts", ".js"],
            alias: {
                "react/jsx-dev-runtime.js": "react/jsx-dev-runtime",
                "react/jsx-runtime.js": "react/jsx-runtime",
            },
        },
        plugins: [
            new HtmlWebpackPlugin({
                inject: true,
                template: appPaths.appHtml,
                filename: "index.html",
            }),
            new InterpolateHtmlPlugin(HtmlWebpackPlugin, {
                PUBLIC_URL: appPaths.appPublic,
                NODE_ENV: NODE_ENV,
            }),
            isProduction &&
                new MiniCssExtractPlugin({
                    filename: isProduction ? "css/[name].[contenthash].chunk.css" : "css/[name].css",
                }),
            new ESLintPlugin({
                extensions: ["js", "jsx", "ts", "tsx"],
                formatter: require.resolve("react-dev-utils/eslintFormatter"),
                eslintPath: require.resolve("eslint"),
                context: appPaths.appSrc,
                cache: true,
                cacheLocation: path.resolve(appPaths.appNodeModules, ".cache/.eslintcache"),
                cwd: appPaths.appPath,
                resolvePluginsRelativeTo: __dirname,
                baseConfig: {
                    extends: [require.resolve("eslint-config-prettier")],
                },
            }),
            new webpack.ProvidePlugin({
                process: "process/browser",
            }),
        ].filter(Boolean),
        performance: false,
        ignoreWarnings: [/Failed to parse source map/],
        stats: "none",
        optimization: {
            minimize: isProduction,
            minimizer: [
                new TerserPlugin({
                    terserOptions: {
                        compress: {
                            ecma: 5,
                            // Disabled because of an issue with Uglify breaking seemingly valid code:
                            // https://github.com/facebook/create-react-app/issues/2376
                            // Pending further investigation:
                            // https://github.com/mishoo/UglifyJS2/issues/2011
                            comparisons: false,
                            // Disabled because of an issue with Terser breaking valid code:
                            // https://github.com/facebook/create-react-app/issues/5250
                            // Pending further investigation:
                            // https://github.com/terser-js/terser/issues/120
                            inline: 2,
                        },
                        mangle: {
                            safari10: true,
                        },
                        // Added for profiling in devtools
                        keep_classnames: false,
                        keep_fnames: false,
                        output: {
                            ecma: 5,
                            comments: false,
                            // Turned on because emoji and regex is not minified properly using default
                            // https://github.com/facebook/create-react-app/issues/2488
                            ascii_only: true,
                        },
                    },
                }),
                new CssMinimizerPlugin(),
            ],
        },
        devServer: {
            static: appPaths.appBuild,
        },
    };
    return config;
};
