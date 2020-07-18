import babel from 'rollup-plugin-babel';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import pkg from './package.json';
import { terser } from "rollup-plugin-terser";

export default [
	// browser-friendly UMD build
	{
		input: 'src/main.js',
		output: {
			name: 'ImageKitUppyPlugin',
			file: pkg.browser,
			format: 'umd'
		},
		plugins: [
			babel({
				extensions: ['.js'],
			}),
			resolve(), // so Rollup can load dependencies in node_modules
            commonjs(), // so Rollup can convert dependencies in node_modules to an ES module
            terser()
		]
	},

	// CommonJS (for Node) and ES module (for bundlers) build.
	// (We could have three entries in the configuration array
	// instead of two, but it's quicker to generate multiple
	// builds from a single configuration where possible, using
	// an array for the `output` option, where we can specify
	// `file` and `format` for each target)
	{
		input: 'src/main.js',
		output: [
			{ file: pkg.main, format: 'cjs' },
			{ file: pkg.module, format: 'es' }
		]
	}
];