import express from 'express';
import Transaction from '../models/Transaction.ts';
import Bill from '../models/Bill.ts';
import Medicine from '../models/Medicine.ts';
import Vehicle from '../models/Vehicle.ts';
import Task from '../models/Task.ts';
import Cow from '../models/Cow.ts';
import Crop from '../models/Crop.ts';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const user = req.query.user;
    if (!user) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    // 1. Finance Stats
    const transactions = await Transaction.find({ user });
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const todaysExpense = transactions
      .filter(t => t.type === 'expense' && new Date(t.date) >= today)
      .reduce((acc, curr) => acc + curr.amount, 0);

    const monthlyIncome = transactions
      .filter(t => t.type === 'income' && new Date(t.date) >= startOfMonth)
      .reduce((acc, curr) => acc + curr.amount, 0);

    const totalIncome = transactions.filter(t => t.type === 'income').reduce((acc, curr) => acc + curr.amount, 0);
    const totalExpense = transactions.filter(t => t.type === 'expense').reduce((acc, curr) => acc + curr.amount, 0);
    const currentSavings = totalIncome - totalExpense;

    const monthlyExpense = transactions
      .filter(t => t.type === 'expense' && new Date(t.date) >= startOfMonth)
      .reduce((acc, curr) => acc + curr.amount, 0);

    const budgetStatus = monthlyIncome > 0 ? Math.round((monthlyExpense / monthlyIncome) * 100) : 0;

    // 2. Upcoming Bill
    const upcomingBill = await Bill.findOne({ user, isPaid: false }).sort({ dueDate: 1 });

    // 3. Medicine Reminder (Just get the first uncompleted one for today)
    const medicine = await Medicine.findOne({ user, isCompleted: false });

    // 4. Pending Tasks
    const pendingTasksCount = await Task.countDocuments({ user, isCompleted: false });

    // 5. Milk Production (Today's total across all cows)
    const cows = await Cow.find({ user });
    let todaysMilk = 0;
    cows.forEach(cow => {
      cow.productionLogs.forEach((log: any) => {
        if (new Date(log.date) >= today) {
          todaysMilk += log.litersProduced;
        }
      });
    });

    // 6. Active Crops
    const activeCropsCount = await Crop.countDocuments({ user, status: { $in: ['Planted', 'Growing'] } });

    // 7. Vehicles
    const vehiclesCount = await Vehicle.countDocuments({ user });

    // 8. Dynamic AI Suggestions
    const aiSuggestions = [];
    if (monthlyExpense > monthlyIncome && monthlyIncome > 0) {
        aiSuggestions.push("You've exceeded your monthly income in expenses. Consider reviewing your recent spending.");
    } else if (monthlyIncome > 0 && monthlyExpense > monthlyIncome * 0.8) {
        aiSuggestions.push("You're nearing your monthly income limit. Keep an eye on non-essential expenses.");
    } else if (monthlyIncome > 0 && monthlyExpense < monthlyIncome * 0.4) {
        aiSuggestions.push("Great job managing your expenses this month! You are saving a good portion of your income.");
    }

    if (upcomingBill) {
        aiSuggestions.push(`Don't forget to pay your upcoming bill: ${upcomingBill.name} for $${upcomingBill.amount}.`);
    }

    if (pendingTasksCount > 0) {
        aiSuggestions.push(`You have ${pendingTasksCount} pending tasks. Try completing a few today to stay productive.`);
    }

    if (activeCropsCount > 0) {
        aiSuggestions.push(`You have ${activeCropsCount} active crops. Make sure to monitor their watering schedule.`);
    }

    if (aiSuggestions.length === 0) {
        aiSuggestions.push("Everything looks good! Your finances and schedules are on track.");
    }

    res.json({
      finance: {
        todaysExpense,
        monthlyIncome,
        currentSavings,
        budgetStatus
      },
      actionRequired: {
        upcomingBill: upcomingBill ? { title: upcomingBill.name, amount: upcomingBill.amount, dueDate: upcomingBill.dueDate } : null,
        medicine: medicine ? { name: medicine.name, dosage: medicine.dosage, time: medicine.time } : null,
        vehicleAlert: vehiclesCount > 0 ? { message: "Check vehicle service logs" } : null,
      },
      domainSnapshots: {
        milkProduction: todaysMilk,
        activeCrops: activeCropsCount,
        pendingTasks: pendingTasksCount,
        recentActivity: transactions.length + pendingTasksCount
      },
      aiSuggestions
    });

  } catch (error: any) {
    console.error('Dashboard error:', error);
    res.status(500).json({ message: error.message });
  }
});

export default router;
