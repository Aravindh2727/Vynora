import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import xss from 'xss-clean';
import { connectDB } from './config/db.ts';

dotenv.config();
connectDB();

const app = express();

// Security Middleware
app.use(helmet()); // Sets HTTP security headers
app.use(cors());
app.use(express.json({ limit: '10kb' })); // Body parser size limit
app.use(xss()); // Prevent Cross-Site Scripting (XSS)

// Rate Limiting against brute-force/DDoS
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 mins
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api', limiter);

import financeRoutes from './routes/financeRoutes.ts';
import documentRoutes from './routes/documentRoutes.ts';
import medicineRoutes from './routes/medicineRoutes.ts';
import billRoutes from './routes/billRoutes.ts';
import taskRoutes from './routes/taskRoutes.ts';
import agricultureRoutes from './routes/agricultureRoutes.ts';
import dairyRoutes from './routes/dairyRoutes.ts';
import vehicleRoutes from './routes/vehicleRoutes.ts';
import inventoryRoutes from './routes/inventoryRoutes.ts';
import passwordRoutes from './routes/passwordRoutes.ts';
import contactRoutes from './routes/contactRoutes.ts';
import studentRoutes from './routes/studentRoutes.ts';
import healthRoutes from './routes/healthRoutes.ts';
import goalRoutes from './routes/goalRoutes.ts';
import familyRoutes from './routes/familyRoutes.ts';
import dashboardRoutes from './routes/dashboardRoutes.ts';

// Routes
app.use('/api/finance', financeRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/medicine', medicineRoutes);
app.use('/api/bills', billRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/agriculture', agricultureRoutes);
app.use('/api/dairy', dairyRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/passwords', passwordRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/family', familyRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.get('/api/health', (req, res) => res.json({ status: 'ok', message: 'PeopleOS API is running securely' }));

app.post('/api/ai/intent', async (req, res) => {
  try {
    const { message, context } = req.body;
    
    // System Prompt for Vynora Context Engine
    const systemPrompt = `You are the core intelligence of Vynora, an advanced life management platform. 
    The user is currently asking: "${message}". 
    You manage their Finance, Agriculture, Dairy, Vehicles, Health, and Reminders. 
    Respond in a helpful, concise, and highly intelligent manner. Keep responses under 3 sentences unless asked for a list.`;

    const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "HTTP-Referer": "http://localhost:5173", // Required by OpenRouter
        "X-Title": "Vynora", // Required by OpenRouter
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "openrouter/free",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message }
        ]
      })
    });

    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.error?.message || "OpenRouter API Error");
    }

    const text = data.choices[0].message.content;

    res.json({ intent: 'assistant', response: text });
  } catch (error: any) {
    console.error('AI Error:', error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT as number, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));
