import {defineConfig} from 'vite';
export default defineConfig({build:{outDir:'dist-comparison',emptyOutDir:true,lib:{entry:'src/controller-comparison.ts',formats:['es'],fileName:()=> 'replay.js'}}});
