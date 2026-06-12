import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load environment variables to process.env so they are available in local API code
  const env = loadEnv(mode, process.cwd(), '')
  Object.assign(process.env, env)

  return {
    plugins: [
      react(),
      {
        name: 'vite-api-plugin',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            if (!req.url || !req.url.startsWith('/api/')) {
              return next()
            }

            try {
              const url = new URL(req.url, `http://${req.headers.host}`)
              const endpointName = url.pathname.replace(/^\/api\//, '')
              const tsFilePath = path.resolve(process.cwd(), 'api', `${endpointName}.ts`)

              if (!fs.existsSync(tsFilePath)) {
                res.statusCode = 404
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ error: `API endpoint /api/${endpointName} not found` }))
                return
              }

              // Compile and load the TS file using Vite
              const module = await server.ssrLoadModule(tsFilePath)
              const handler = module.default

              if (typeof handler !== 'function') {
                res.statusCode = 500
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ error: `API endpoint /api/${endpointName} does not export a default handler function` }))
                return
              }

              // Read request body
              const buffers = []
              for await (const chunk of req) {
                buffers.push(chunk)
              }
              const body = Buffer.concat(buffers)

              // Build web standard Request object
              const webReq = new Request(`http://${req.headers.host}${req.url}`, {
                method: req.method,
                headers: req.headers,
                body: ['GET', 'HEAD'].includes(req.method) ? undefined : body,
              })

              // Execute edge handler
              const webRes = await handler(webReq)

              // Write response back to Connect server
              res.statusCode = webRes.status
              webRes.headers.forEach((value, key) => {
                res.setHeader(key, value)
              })

              const resBody = await webRes.arrayBuffer()
              res.end(Buffer.from(resBody))
            } catch (err) {
              console.error(`Error executing API ${req.url}:`, err)
              res.statusCode = 500
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: err.message || 'Internal Server Error' }))
            }
          })
        }
      }
    ],
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('@supabase/')) {
                return 'supabase';
              }
              if (
                id.includes('react') ||
                id.includes('react-dom') ||
                id.includes('react-router-dom') ||
                id.includes('@remix-run/router')
              ) {
                return 'vendor';
              }
            }
          }
        }
      }
    }
  }
})
