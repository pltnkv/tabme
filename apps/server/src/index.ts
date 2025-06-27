import express, { Request, Response } from "express"
import cors from "cors"
import dotenv from "dotenv"
import swaggerUi from "swagger-ui-express"
import swaggerJsdoc from "swagger-jsdoc"

// Routes
import authRoutes from "./routes/auth.routes"
import userRoutes from "./routes/user.routes"
import spaceRoutes from "./routes/space.routes"
import folderRoutes from "./routes/folder.routes"
import itemRoutes from "./routes/item.routes"
import syncRoutes from "./routes/sync.routes"
import debugRoutes from "./routes/debug.routes"

// Middleware
import { errorHandler } from "./middleware/errorHandler.middleware"
import { swaggerOptions } from "./swaggerOptions"

dotenv.config()

const app = express()

// CORS configuration
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      return callback(null, true)
    }

    // Allow Chrome extension origins
    if (origin.startsWith("chrome-extension://jnhiookaaldadiimlgncedhkpmhlmmip") || origin.startsWith("chrome-extension://jjdbikbbknmhkknpfnlhgpcikbfjldee")) {
      return callback(null, true)
    }
    // Block other origins
    return callback(new Error("Not allowed by CORS"), false)
  },
  credentials: true
}))

// Body parsing middleware
app.use(express.json({ limit: "15mb" }))
app.use(express.urlencoded({ extended: true }))

// Generate OpenAPI specification
const openapiSpec = swaggerJsdoc(swaggerOptions)

// Serve Swagger UI
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(openapiSpec, {
  explorer: false,
  customCss: ".swagger-ui .topbar { display: none }",
  customSiteTitle: "Tabme API Documentation"
}))

// Serve OpenAPI JSON
app.get("/openapi.json", (req: Request, res: Response) => {
  res.setHeader("Content-Type", "application/json")
  res.json(openapiSpec)
})

// Health check endpoint
app.get("/health", (req: Request, res: Response) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || "1.0.0"
  })
})

// API Routes
app.use("/api/auth", authRoutes)
app.use("/api/users", userRoutes)
app.use("/api/spaces", spaceRoutes)
app.use("/api/folders", folderRoutes)
app.use("/api/items", itemRoutes)
app.use("/api/sync", syncRoutes)

// Debug Routes (NO AUTHENTICATION - for development only)
if (process.env.NODE_ENV === "development") {
  app.use("/api/debug", debugRoutes)
}

// 404 handler
app.use("*", (req: Request, res: Response) => {
  res.status(404).json({
    error: "Route not found",
    path: req.originalUrl,
    method: req.method
  })
})

// Global error handler (must be last)
app.use(errorHandler)

const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
  console.log(`🚀 Tabme Server running on port ${PORT}`)
  console.log(`📚 API Documentation: http://localhost:${PORT}/api-docs`)
  console.log(`📄 OpenAPI JSON: http://localhost:${PORT}/openapi.json`)
  console.log(`❤️  Health Check: http://localhost:${PORT}/health`)
  console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
}); 