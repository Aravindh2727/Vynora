# Vynora
> One Platform. Every Part of Life.

Vynora is a comprehensive, AI-powered life operating system designed to centralize and simplify every aspect of your daily life. From managing finances and household inventory to tracking agricultural data and family schedules, Vynora is your all-in-one digital hub.

## 🌟 Key Features

*   **AI Assistant:** An intelligent contextual engine powered by OpenRouter that analyzes your data and provides smart suggestions.
*   **Finance & Goals:** Track income, expenses, budgets, and long-term financial goals.
*   **Agriculture & Dairy:** Specialized managers for crop cycles, yields, and dairy logs.
*   **Household & Vehicles:** Keep tabs on home inventory, vehicle maintenance, and fuel logs.
*   **Health & Wellness:** Track health records, manage medicine reminders, and store emergency contacts.
*   **Organization:** Digital locker for important documents, password vault, and task/student planners.
*   **Progressive Web App (PWA):** Install Vynora directly to your desktop or mobile device for a native app experience.

## 🚀 Tech Stack

**Frontend:**
*   React 19 & Vite
*   Tailwind CSS (Styling & Glassmorphism)
*   Framer Motion (Animations)
*   Zustand (State Management)
*   Recharts (Data Visualization)
*   Vite PWA Plugin

**Backend & Services:**
*   Node.js & Express
*   Firebase (Authentication/Database)
*   OpenRouter API (AI Integration)

## 🛠️ Getting Started

### Prerequisites
*   Node.js (v18+)
*   npm or yarn

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Aravindh2727/Vynora.git
   cd Vynora
   ```

2. **Setup the Backend:**
   ```bash
   cd server
   npm install
   ```
   Create a `.env` file in the `server` directory and add your keys (refer to `.env.example` if available):
   ```env
   PORT=5000
   OPENROUTER_API_KEY=your_openrouter_api_key_here
   ```
   Start the backend server:
   ```bash
   npm run dev
   ```

3. **Setup the Frontend:**
   ```bash
   cd ../client
   npm install
   ```
   Start the frontend development server:
   ```bash
   npm run dev
   ```

4. **Open the App:**
   Navigate to `http://localhost:5173` in your browser.

## 🎨 Design Philosophy
Vynora uses a modern, sleek glassmorphism aesthetic with vibrant neon accents on a dark theme to create a premium and highly interactive user experience.
