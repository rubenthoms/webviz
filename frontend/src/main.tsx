import React from "react";
import { createRoot } from "react-dom/client";

import { EnsembleIdent } from "@framework/EnsembleIdent";
import { AuthProvider } from "@framework/internal/providers/AuthProvider";
import { CustomQueryClientProvider } from "@framework/internal/providers/QueryClientProvider";

import App from "./App";
import { GlobalErrorBoundary } from "./GlobalErrorBoundary";

/*
    If the `cleanStart` query parameter is given, 
    the application will clear all local storage before rendering the application.
*/
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.has("cleanStart")) {
    localStorage.clear();
    urlParams.delete("cleanStart");
    window.location.search = urlParams.toString();
}
if (urlParams.has("caseUuid")) {
    if (urlParams.has("ensemble")) {
        const ensembleIdents: EnsembleIdent[] = [];
        const caseUuid = urlParams.get("caseUuid");
        const ensembleNames = urlParams.getAll("ensemble");

        if (caseUuid) {
            // If caseUuid is not a valid type, show a message in a potential notification system

            for (const ensembleName of ensembleNames) {
                try {
                    ensembleIdents.push(new EnsembleIdent(caseUuid, ensembleName));
                } catch (err) {
                    console.warn(`Could not create ensemble ident: ${err}`);
                }
            }

            if (ensembleIdents.length > 0) {
                const ensembleIdentStringsToStore = ensembleIdents.map((el) => el.toString());
                localStorage.setItem("ensembleIdents", JSON.stringify(ensembleIdentStringsToStore));
            }
        }
    }
}

// --------------------------------------------------------------------

const container = document.getElementById("root");

if (!container) {
    throw new Error("Could not find root container");
}

const root = createRoot(container);

root.render(
    <React.StrictMode>
        <GlobalErrorBoundary>
            <AuthProvider>
                <CustomQueryClientProvider>
                    <App />
                </CustomQueryClientProvider>
            </AuthProvider>
        </GlobalErrorBoundary>
    </React.StrictMode>
);
