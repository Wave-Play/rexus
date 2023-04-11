import { defineConfig } from "tsup";

export default defineConfig({
	entry: ["src"],
	outDir: "dist",
	format: ["cjs", "esm"],
	bundle: false,
	clean: false,
	dts: true,
	minify: true,
	sourcemap: true,
	treeshake: true,
});
