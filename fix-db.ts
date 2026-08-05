import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

// Connect using the URI from .env
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/lifehub');

// We have to define the schema quickly to run the update
const transactionSchema = new mongoose.Schema({
  category: { type: String },
  title: { type: String }
}, { strict: false });

const Transaction = mongoose.model('Transaction_Temp', transactionSchema, 'transactions');

async function fixDB() {
  console.log("Looking for old Agriculture transactions to convert to Dairy...");
  try {
    const result = await Transaction.updateMany(
      { 
        category: 'Agriculture',
        $or: [
          { title: { $regex: /Farm Milk/i } },
          { title: { $regex: /Farm Feed/i } },
          { title: { $regex: /Cattle/i } },
          { title: { $regex: /Treatment/i } },
          { title: { $regex: /Vaccination/i } }
        ]
      },
      { $set: { category: 'Dairy' } }
    );
    console.log(`Successfully migrated ${result.modifiedCount} old transactions to the Dairy category.`);
  } catch(e) {
    console.error("Error migrating:", e);
  }
  process.exit(0);
}

fixDB();
