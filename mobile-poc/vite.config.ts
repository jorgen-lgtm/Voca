import { defineConfig } from 'vite'
import { fileURLToPath } from 'node:url'
export default defineConfig({resolve:{alias:{'@':fileURLToPath(new URL('./vendor',import.meta.url))}},build:{outDir:'dist'}})
