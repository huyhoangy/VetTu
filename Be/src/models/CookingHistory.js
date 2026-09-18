const mongoose = require('mongoose');

const cookingHistorySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    recipe: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Recipe',
      required: true,
    },
    recipeSnapshot: {
      title: { type: String, required: true },
      imageUrl: { type: String, default: '' },
      prepTimeMinutes: { type: Number, default: 0 },
      cookTimeMinutes: { type: Number, default: 0 },
      difficulty: { type: String, default: 'EASY' },
      servings: { type: Number, default: 2 },
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      default: 5,
    },
    notes: {
      type: String,
      default: '',
      trim: true,
    },
    servingsCooked: {
      type: Number,
      default: 2,
    },
    timesCooked: {
      type: Number,
      default: 1,
    },
    cookedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('CookingHistory', cookingHistorySchema);
