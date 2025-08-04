const mongoose = require('mongoose');

// Define the meat product types
const MEAT_PRODUCTS = [
  'KK_KENYA_LAMB',
  'KENYA_BAKRA_GOAT', 
  'BEEF_DASTI_SHOULDER',
  'BEEF_RAAN_LEG',
  'AFQ_AFRICA_LAMB',
  'MAHALI_LOCAL_LAMB',
  'AUSTRALIAN_LAMB',
  'KAZAKHSTAN_LAMB'
];

const SHOPS = ['SHOP_47', 'SHOP_43', 'SHOP_59'];

// Schema for individual product stock entry
const ProductStockSchema = new mongoose.Schema({
  productType: {
    type: String,
    enum: MEAT_PRODUCTS,
    required: true
  },
  category: {
    type: String,
    enum: ['BEEF PARTS', 'MUTTON PARTS', null],
    default: null
  },
  pieces: {
    type: Number,
    default: 0,
    min: 0
  },
  weight: {
    type: Number, // in KG
    default: 0,
    min: 0
  },
  pricePerUnit: {
    type: Number, // Price per KG
    default: 0,
    min: 0
  },
  subtotal: {
    type: Number, // pricePerUnit * weight (before VAT)
    default: 0,
    min: 0
  },
  vatPercentage: {
    type: Number, // VAT percentage (0-100)
    default: 0,
    min: 0,
    max: 100
  },
  vatAmount: {
    type: Number, // Calculated VAT amount
    default: 0,
    min: 0
  },
  totalCost: {
    type: Number, // Final cost including VAT
    default: 0,
    min: 0
  }
});

// Schema for shop transfers
const ShopTransferSchema = new mongoose.Schema({
  shop: {
    type: String,
    enum: SHOPS,
    required: true
  },
  products: [ProductStockSchema],
  transferTime: {
    type: Date,
    default: Date.now
  },
  notes: String
});

// Schema for daily purchases
const DailyPurchaseSchema = new mongoose.Schema({
  supplier: {
    type: String,
    required: true
  },
  products: [ProductStockSchema],
  purchaseTime: {
    type: Date,
    default: Date.now
  },
  subtotal: {
    type: Number, // Total before VAT
    default: 0
  },
  totalVatAmount: {
    type: Number, // Total VAT amount
    default: 0
  },
  totalCost: {
    type: Number, // Final total including VAT
    default: 0
  },
  notes: String
});

// Schema for stock reconciliation (actual vs calculated)
const StockReconciliationSchema = new mongoose.Schema({
  productType: {
    type: String,
    enum: MEAT_PRODUCTS,
    required: true
  },
  calculatedPieces: {
    type: Number,
    default: 0
  },
  calculatedWeight: {
    type: Number,
    default: 0
  },
  actualPieces: {
    type: Number,
    default: 0
  },
  actualWeight: {
    type: Number,
    default: 0
  },
  differencePieces: {
    type: Number,
    default: 0
  },
  differenceWeight: {
    type: Number,
    default: 0
  },
  notes: String
});

// Main Store Inventory Schema for daily tracking
const StoreInventorySchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
    unique: true // One record per day
  },
  
  // Opening stock from previous day
  openingStock: [ProductStockSchema],
  
  // Daily purchases
  dailyPurchases: [DailyPurchaseSchema],
  
  // Calculated total available stock (opening + purchases)
  totalAvailableStock: [ProductStockSchema],
  
  // Transfers to shops
  shopTransfers: [ShopTransferSchema],
  
  // Calculated remaining stock after transfers
  calculatedRemainingStock: [ProductStockSchema],
  
  // Final reconciliation with actual counts
  stockReconciliation: [StockReconciliationSchema],
  
  // Final stock that becomes next day's opening stock
  finalStock: [ProductStockSchema],
  
  // Status tracking
  status: {
    type: String,
    enum: ['DRAFT', 'IN_PROGRESS', 'RECONCILED', 'FINALIZED'],
    default: 'DRAFT'
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  
  // User who created/modified
  createdBy: String,
  lastModifiedBy: String,
  
  // Additional notes
  notes: String,

  // Shop stock description for 3 shops
  shopStockDescription: {
    type: String,
    default: ''
  }
});

// Pre-save middleware to update timestamps
StoreInventorySchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Method to calculate total available stock
StoreInventorySchema.methods.calculateTotalAvailableStock = function() {
  const totals = {};

  // Initialize all product types with zero values
  MEAT_PRODUCTS.forEach(productType => {
    totals[productType] = { pieces: 0, weight: 0 };
  });

  // Add opening stock
  this.openingStock.forEach(item => {
    if (totals[item.productType]) {
      totals[item.productType].pieces += item.pieces || 0;
      totals[item.productType].weight += item.weight || 0;
    }
  });

  // Add daily purchases
  this.dailyPurchases.forEach(purchase => {
    if (purchase.products && purchase.products.length > 0) {
      purchase.products.forEach(item => {
        if (totals[item.productType]) {
          totals[item.productType].pieces += item.pieces || 0;
          totals[item.productType].weight += item.weight || 0;
        }
      });
    }
  });

  // Convert to array format - only include products with stock > 0
  this.totalAvailableStock = Object.keys(totals)
    .filter(productType => totals[productType].pieces > 0 || totals[productType].weight > 0)
    .map(productType => ({
      productType,
      pieces: totals[productType].pieces,
      weight: totals[productType].weight,
      pricePerUnit: 0,
      subtotal: 0,
      vatPercentage: 0,
      vatAmount: 0,
      totalCost: 0
    }));

  return this.totalAvailableStock;
};

// Method to calculate remaining stock after shop transfers
StoreInventorySchema.methods.calculateRemainingStock = function() {
  const remaining = {};

  // Initialize all product types with zero values
  MEAT_PRODUCTS.forEach(productType => {
    remaining[productType] = { pieces: 0, weight: 0 };
  });

  // Start with total available stock
  this.totalAvailableStock.forEach(item => {
    if (remaining[item.productType]) {
      remaining[item.productType].pieces = item.pieces || 0;
      remaining[item.productType].weight = item.weight || 0;
    }
  });

  // Subtract shop transfers (only if we have available stock)
  this.shopTransfers.forEach(transfer => {
    if (transfer.products && transfer.products.length > 0) {
      transfer.products.forEach(item => {
        if (remaining[item.productType]) {
          // Only subtract if we have available stock for this product
          const availablePieces = remaining[item.productType].pieces;
          const availableWeight = remaining[item.productType].weight;

          if (availablePieces > 0 || availableWeight > 0) {
            // Deduct pieces only if category is not BEEF PARTS or MUTTON PARTS
            if (item.category !== 'BEEF PARTS' && item.category !== 'MUTTON PARTS') {
              remaining[item.productType].pieces -= item.pieces || 0;
            }
            // Always deduct weight
            remaining[item.productType].weight -= item.weight || 0;
          }
          // Note: If no available stock, the transfer is invalid but we don't subtract
          // This should be caught by validation in the routes
        }
      });
    }
  });

  // Convert to array format - only include products with remaining stock > 0
  this.calculatedRemainingStock = Object.keys(remaining)
    .filter(productType => remaining[productType].pieces > 0 || remaining[productType].weight > 0)
    .map(productType => ({
      productType,
      pieces: Math.max(0, remaining[productType].pieces), // Ensure non-negative
      weight: Math.max(0, remaining[productType].weight),
      pricePerUnit: 0,
      subtotal: 0,
      vatPercentage: 0,
      vatAmount: 0,
      totalCost: 0
    }));

  return this.calculatedRemainingStock;
};

// Method to calculate reconciliation differences
StoreInventorySchema.methods.calculateReconciliation = function() {
  // Ensure we have calculated remaining stock first
  if (!this.calculatedRemainingStock || this.calculatedRemainingStock.length === 0) {
    this.calculateRemainingStock();
  }

  // Create a map of calculated remaining stock for easy lookup
  const remainingStockMap = {};
  this.calculatedRemainingStock.forEach(item => {
    remainingStockMap[item.productType] = {
      pieces: item.pieces || 0,
      weight: item.weight || 0
    };
  });

  // Update reconciliation with calculated values and compute differences
  this.stockReconciliation.forEach(recon => {
    const calculated = remainingStockMap[recon.productType] || { pieces: 0, weight: 0 };

    // Set calculated values from remaining stock
    recon.calculatedPieces = calculated.pieces;
    recon.calculatedWeight = calculated.weight;

    // Calculate differences
    recon.differencePieces = (recon.actualPieces || 0) - recon.calculatedPieces;
    recon.differenceWeight = (recon.actualWeight || 0) - recon.calculatedWeight;
  });

  // Update final stock with actual counts (including zero values for complete tracking)
  this.finalStock = this.stockReconciliation.map(recon => ({
    productType: recon.productType,
    pieces: recon.actualPieces || 0,
    weight: recon.actualWeight || 0,
    pricePerUnit: 0,
    subtotal: 0,
    vatPercentage: 0,
    vatAmount: 0,
    totalCost: 0
  }));

  return this.stockReconciliation;
};

// Static method to get product display names
StoreInventorySchema.statics.getProductDisplayNames = function() {
  return {
    'KK_KENYA_LAMB': 'KK (Kenya Lamb)',
    'KENYA_BAKRA_GOAT': 'Kenya Bakra (Goat)',
    'BEEF_DASTI_SHOULDER': 'Beef Dasti (Shoulder)',
    'BEEF_RAAN_LEG': 'Beef Raan (Leg)',
    'AFQ_AFRICA_LAMB': 'AFQ (Africa Lamb)',
    'MAHALI_LOCAL_LAMB': 'Mahali (Local Lamb)',
    'AUSTRALIAN_LAMB': 'Australian Lamb',
    'KAZAKHSTAN_LAMB': 'Kazakhstan Lamb'
  };
};

// Static method to get shop display names
StoreInventorySchema.statics.getShopDisplayNames = function() {
  return {
    'SHOP_47': 'Shop 47',
    'SHOP_43': 'Shop 43', 
    'SHOP_59': 'Shop 59'
  };
};

// Index for efficient querying
StoreInventorySchema.index({ date: -1 });
StoreInventorySchema.index({ status: 1 });

module.exports = mongoose.model('StoreInventory', StoreInventorySchema);
