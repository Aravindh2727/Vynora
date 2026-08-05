import { connectDB } from './config/db.ts';
import Transaction from './models/Transaction.ts';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const fixDb = async () => {
    await connectDB();
    const res = await Transaction.updateMany(
        { title: { $regex: /^EMI Payment/ } },
        { $set: { category: 'Loan EMI' } }
    );
    console.log("Updated transactions:", res);
    process.exit(0);
};

fixDb();
