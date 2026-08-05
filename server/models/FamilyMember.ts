import mongoose from 'mongoose';

const familyMemberSchema = new mongoose.Schema({
  user: { type: String, required: true },
  name: { type: String, required: true },
  email: { type: String },
  relation: { type: String, required: true },
  avatarColor: { type: String, default: '#00f2fe' }
}, { timestamps: true });

export default mongoose.model('FamilyMember', familyMemberSchema);
