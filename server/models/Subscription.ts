import mongoose from 'mongoose';

const subscriptionSchema = new mongoose.Schema({
  user: { type: String, required: true },
  subscription: { type: String, required: true } // JSON stringified PushSubscription object
}, { timestamps: true });

export default mongoose.model('Subscription', subscriptionSchema);
