import react from "@vitejs/plugin-react";

import path from "path";
import { defineConfig } from "vite";
import glsl from "vite-plugin-glsl";

import aliases from "./aliases.json";

const paths = {
    public: "./public",
    publicHtmlFile: "./index.html",
    root: "./src",
};

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [glsl(), react()],
    build: {
        rollupOptions: {
            input: {
                app: paths.publicHtmlFile,
            },
        },
    },
    resolve: {
        alias: Object.keys(aliases.compilerOptions.paths).reduce(
            (prev, current) => ({
                ...prev,
                [current.replace("/*", "")]: path.resolve(
                    __dirname,
                    aliases.compilerOptions.paths[current][0].replace("/*", "")
                ),
            }),
            {
                "!style-loader!": "",
                "!css-loader!": "",
                "!sass-loader!": "",
                "!style-loader!css-loader!": "",
                "!vue-style-loader!css-loader!sass-loader!": "",
                "!!raw-loader!": "",
            }
        ),
    },
    server: {
        port: 8080,
        proxy: {
            "/api": {
                target: "http://backend:5000",
                rewrite: (path) => path.replace(/^\/api/, ""),
            },
        },
    },
});
