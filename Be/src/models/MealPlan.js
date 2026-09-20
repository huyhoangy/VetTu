const mongoose = require('mongoose');

const mealSlotSchema = new mongoose.Schema(
  {
    slot: {
      type: String,
      enum: ['breakfast', 'lunch', 'dinner', 'snack'],
      required: true,
    },
    recipe: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Recipe',
      default: null,
    },
    customDishName: {
      type: String,
      trim: true,
      default: '',
    },
    dishImage: {
      type: String,
      default: '',
    },
    note: {
      type: String,
      trim: true,
      default: '',
    },
    completed: {
      type: Boolean,
      default: false,
    },
  },
  { _id: true }
);

const dayPlanSchema = new mongoose.Schema(
  {
    dayIndex: {
      type: Number, // 0 = Mon, 1 = Tue, 2 = Wed, 3 = Thu, 4 = Fri, 5 = Sat, 6 = Sun
      required: true,
      min: 0,
      max: 6,
    },
    date: {
      type: String, // 'YYYY-MM-DD'
      required: true,
    },
    meals: [mealSlotSchema],
  },
  { _id: true }
);

const mealPlanSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    weekStartDate: {
      type: String, // 'YYYY-MM-DD' (Always Monday of the week)
      required: true,
      index: true,
    },
    days: [dayPlanSchema],
    note: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index to prevent duplicate plans for the same user and week
mealPlanSchema.index({ user: 1, weekStartDate: 1 }, { unique: true });

module.exports = mongoose.model('MealPlan', mealPlanSchema);
