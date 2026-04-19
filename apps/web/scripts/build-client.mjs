import { build } from "esbuild";

await build({
  entryPoints: ["./src/lib/client.js"],
  outfile: "./public/js/client.min.js",
  bundle: true,
  format: "iife",
  minify: true,
  platform: "browser",
  target: ["es2018"],
  legalComments: "none",
});
