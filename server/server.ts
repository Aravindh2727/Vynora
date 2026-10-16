import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import xss from 'xss-clean';
import notificationRoutes from './routes/notificationRoutes.ts';

const app = express();

// Security Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10kb' }));
app.use(xss());

// Rate Limiting against brute-force/DDoS
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 mins
  max: 100,
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api', limiter);

// Dedicated retained services
app.use('/api/notifications', notificationRoutes);
app.get('/api/health', (req, res) => res.json({ 
  status: 'ok', 
  service: 'Vynora Intelligence Server', 
  database: 'Firebase Cloud Firestore' 
}));

app.post('/api/ai/intent', async (req, res) => {
  try {
    const { message, context } = req.body;
    
    // System Prompt for Vynora Context Engine
    const systemPrompt = `You are the core intelligence of Vynora, an advanced life management platform. 
    The user is currently asking: "${message}". 
    You manage their Finance, Agriculture, Dairy, Vehicles, Health, and Reminders. 
    Respond in a helpful, concise, and highly intelligent manner. Keep responses under 3 sentences unless asked for a list.`;

    const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

    if (!OPENROUTER_API_KEY) {
      let fallbackText = "I'm currently operating in offline mode. Set OPENROUTER_API_KEY in server/.env for full cloud AI reasoning. ";
      const lower = (message || '').toLowerCase();
      if (lower.includes('expense') || lower.includes('money') || lower.includes('spend') || lower.includes('finance')) {
        fallbackText += "You can record and budget all your daily expenses and income in the Finance Tracker.";
      } else if (lower.includes('loan') || lower.includes('emi')) {
        fallbackText += "Check the Loan Management module to compute EMI amortizations and track paid installments.";
      } else if (lower.includes('milk') || lower.includes('cow') || lower.includes('dairy')) {
        fallbackText += "Use the Dairy Management module to log morning and evening milk yields and manage feed costs.";
      } else if (lower.includes('crop') || lower.includes('farm') || lower.includes('agriculture')) {
        fallbackText += "Your crops, fertilizers, and field revenues are monitored in the Agriculture Manager.";
      } else if (lower.includes('medicine') || lower.includes('pill')) {
        fallbackText += "Set up medicine reminders with custom schedules in Medicine Reminder.";
      } else if (lower.includes('bill')) {
        fallbackText += "Review upcoming and overdue bills in the Bill Reminder module.";
      } else {
        fallbackText += `I received: "${message}". How can I help you manage your day?`;
      }
      return res.json({ intent: 'assistant', response: fallbackText });
    }

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "HTTP-Referer": "http://localhost:5173",
        "X-Title": "Vynora",
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
app.listen(PORT as number, '0.0.0.0', () => console.log(`Vynora server running on port ${PORT} (Firebase Firestore & Cloudinary architecture)`));
