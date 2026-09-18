const mongoose = require('mongoose');

const ingredientItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    normalized_name: { type: String, required: true, lowercase: true, trim: true }, // e.g. "ca chua"
    quantity: { type: String, default: '' },
    unit: { type: String, default: '' },
    isOptional: { type: Boolean, default: false },
  },
  { _id: false }
);

const instructionStepSchema = new mongoose.Schema(
  {
    stepNumber: { type: Number, required: true },
    instruction: { type: String, required: true },
    imageUrl: { type: String, default: null },
  },
  { _id: false }
);

const recipeSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please provide recipe title'],
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    imageUrl: {
      type: String,
      default: 'https://images.unsplash.com/photo-1495521821757-a1efb6729352?q=80&w=800',
    },
    prepTimeMinutes: {
      type: Number,
      default: 10,
    },
    cookTimeMinutes: {
      type: Number,
      default: 15,
    },
    servings: {
      type: Number,
      default: 2,
    },
    difficulty: {
      type: String,
      enum: ['EASY', 'MEDIUM', 'HARD'],
      default: 'EASY',
    },
    appliance: {
      type: String,
      enum: ['STOVE', 'AIRFRYER', 'AIR_FRYER', 'RICE_COOKER', 'MICROWAVE', 'ALL'],
      default: 'ALL',
    },
    ingredients: [ingredientItemSchema],
    // Normalized list of ingredient names for fast querying & matching
    ingredientKeywords: [
      {
        type: String,
        lowercase: true,
        trim: true,
      },
    ],
    instructions: [instructionStepSchema],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    likesCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

recipeSchema.index({ ingredientKeywords: 1 });
recipeSchema.index({ title: 'text', description: 'text' });

module.exports = mongoose.model('Recipe', recipeSchema);
