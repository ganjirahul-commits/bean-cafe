import { build } from "esbuild";
build({
  entryPoints: ["src/app.jsx"],
  bundle: true, minify: true, format: "iife",
  loader: { ".jsx": "jsx" }, jsx: "automatic",
  outfile: "app.js",
  define: { "process.env.NODE_ENV": '"production"' },
}).then(() => console.log("built app.js")).catch(e => { console.error(e); process.exit(1); });
