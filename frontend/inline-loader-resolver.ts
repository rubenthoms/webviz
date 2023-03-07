import path from "path";

export default function plugin() {
    return {
        name: "inline-loader-resolver",
        resolveId: function (source: string, importer: string) {
            console.log("source", source);
            console.log("importer", importer);
            if (/!?(![a-z-]+-loader)+!/.test(source)) {
                const newFile = source.replace(/!?(![a-z-]+-loader)+!/, "");
                if (path.isAbsolute(newFile)) {
                    return newFile;
                }
                return {
                    id: path.join(path.dirname(origin), newFile),
                };
            }
            return null;
        },
    };
}
