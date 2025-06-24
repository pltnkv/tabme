import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'TabMe server is running!' });
});

app.get('/api/data', (req, res) => {
  res.json({ 
    message: 'Hello from TabMe server!',
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 TabMe server running on port ${PORT}`);
}); 