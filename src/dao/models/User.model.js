import mongoose from "mongoose";

const { Schema, model } = mongoose;
const usersCollection = "Users";
const cartsCollection = "Carts";

const userSchema = new Schema({
  first_name: { type: String },
  last_name: { type: String },
  email: { type: String, unique: true },
  age: { type: Number },
  password: { type: String },
  cart: { type: Schema.Types.ObjectId, ref: cartsCollection },
  role: { type: String, enum: ["user", "premium"], default: "user" },
  lastConnection: { type: Date, default: Date.now() },
});

const User = model(usersCollection, userSchema);

export default User;
