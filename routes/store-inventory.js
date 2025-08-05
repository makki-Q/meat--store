const express = require('express');
const router = express.Router();
const StoreInventory = require('../models/StoreInventory');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

// Get or create store inventory for a specific date
router.get('/date/:date', async (req, res) => {
  try {
    const start = new Date(req.params.date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    let inventory = await StoreInventory.findOne({
      date: { $gte: start, $lt: end }
    });

    if (!inventory) {
      // Get previous day's final stock as opening stock
      const previousDay = new Date(start);
      previousDay.setDate(previousDay.getDate() - 1);
      previousDay.setHours(0, 0, 0, 0);
      const prevDayEnd = new Date(previousDay);
      prevDayEnd.setDate(prevDayEnd.getDate() + 1);

      const previousInventory = await StoreInventory.findOne({
        date: { $gte: previousDay, $lt: prevDayEnd }
      });

      // Transform final stock to opening stock format (reset pricing info)
      const openingStock = (previousInventory?.finalStock || []).map(item => ({
        productType: item.productType,
        pieces: item.pieces || 0,
        weight: item.weight || 0,
        pricePerUnit: 0, // Reset pricing for new day
        subtotal: 0,
        vatPercentage: 0,
        vatAmount: 0,
        totalCost: 0
      }));

      // Create new inventory for this date
      inventory = new StoreInventory({
        date: start,
        openingStock: openingStock,
        dailyPurchases: [],
        shopTransfers: [],
        status: 'DRAFT'
      });

      // Calculate initial totals
      inventory.calculateTotalAvailableStock();
      inventory.calculateRemainingStock();

      await inventory.save();
    }

    res.json(inventory);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get or create today's inventory
router.get('/today', async (req, res) => {
  try {
    const today = new Date();
    const start = new Date(today);
    start.setHours(0, 0, 0, 0);
    const end = new Date(today);
    end.setHours(23, 59, 59, 999);
    
    let inventory = await StoreInventory.findOne({ date: { $gte: start, $lt: end } });
    
    if (!inventory) {
      // Get yesterday's final stock as today's opening stock
      const yesterday = new Date(start);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayEnd = new Date(yesterday);
      yesterdayEnd.setHours(23, 59, 59, 999);

      const yesterdayInventory = await StoreInventory.findOne({ date: { $gte: yesterday, $lt: yesterdayEnd } });

      // Transform final stock to opening stock format (reset pricing info)
      const openingStock = (yesterdayInventory?.finalStock || []).map(item => ({
        productType: item.productType,
        pieces: item.pieces || 0,
        weight: item.weight || 0,
        pricePerUnit: 0, // Reset pricing for new day
        subtotal: 0,
        vatPercentage: 0,
        vatAmount: 0,
        totalCost: 0
      }));

      inventory = new StoreInventory({
        date: today,
        openingStock: openingStock,
        dailyPurchases: [],
        shopTransfers: [],
        status: 'DRAFT'
      });

      // Calculate initial totals
      inventory.calculateTotalAvailableStock();
      inventory.calculateRemainingStock();

      await inventory.save();
    }
    
    res.json(inventory);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create or update store inventory
router.post('/', async (req, res) => {
  try {
    const inventoryDate = new Date(req.body.date);
    inventoryDate.setHours(0, 0, 0, 0);
    
    let inventory = await StoreInventory.findOne({ date: inventoryDate });
    
    if (inventory) {
      // Update existing inventory
      Object.assign(inventory, req.body);
      inventory.lastModifiedBy = req.body.userId || 'system';
    } else {
      // Create new inventory
      inventory = new StoreInventory({
        date: inventoryDate,
        ...req.body,
        createdBy: req.body.userId || 'system'
      });
    }
    
    await inventory.save();
    res.json(inventory);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Add daily purchase
router.post('/:id/purchases', async (req, res) => {
  try {
    const inventory = await StoreInventory.findById(req.params.id);
    if (!inventory) {
      return res.status(404).json({ message: 'Inventory not found' });
    }

    // Calculate VAT for each product and overall totals
    const purchaseData = { ...req.body };
    let subtotal = 0;
    let totalVatAmount = 0;

    // Process each product to calculate VAT
    if (purchaseData.products && purchaseData.products.length > 0) {
      purchaseData.products = purchaseData.products.map(product => {
        const { weight, pricePerUnit, vatPercentage = 0 } = product;

        // Calculate costs for this product
        const productSubtotal = (pricePerUnit || 0) * (weight || 0);
        const productVatAmount = (productSubtotal * (vatPercentage || 0)) / 100;
        const productTotalCost = productSubtotal + productVatAmount;

        // Add to overall totals
        subtotal += productSubtotal;
        totalVatAmount += productVatAmount;

        return {
          ...product,
          subtotal: productSubtotal,
          vatAmount: productVatAmount,
          totalCost: productTotalCost
        };
      });
    }

    // Set overall purchase totals
    purchaseData.subtotal = subtotal;
    purchaseData.totalVatAmount = totalVatAmount;
    purchaseData.totalCost = subtotal + totalVatAmount;

    inventory.dailyPurchases.push(purchaseData);
    inventory.calculateTotalAvailableStock();
    inventory.calculateRemainingStock();

    await inventory.save();
    res.json(inventory);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Add shop transfer
router.post('/:id/transfers', async (req, res) => {
  try {
    const inventory = await StoreInventory.findById(req.params.id);
    if (!inventory) {
      return res.status(404).json({ message: 'Inventory not found' });
    }

    // Ensure calculations are up to date
    inventory.calculateTotalAvailableStock();

    // Validate transfer against available stock
    const transferData = req.body;
    if (transferData.products && transferData.products.length > 0) {
      const availableStockMap = {};
      inventory.totalAvailableStock.forEach(item => {
        availableStockMap[item.productType] = {
          pieces: item.pieces || 0,
          weight: item.weight || 0
        };
      });

      // Check each product in the transfer
      for (const product of transferData.products) {
        const available = availableStockMap[product.productType];
        if (!available || available.pieces === 0) {
          return res.status(400).json({
            message: `Cannot transfer ${product.productType}: No available stock. Available: ${available ? available.pieces : 0} pieces.`
          });
        }

        if (product.pieces > available.pieces) {
          return res.status(400).json({
            message: `Cannot transfer ${product.pieces} pieces of ${product.productType}: Only ${available.pieces} pieces available.`
          });
        }

        if (product.weight > available.weight) {
          return res.status(400).json({
            message: `Cannot transfer ${product.weight} kg of ${product.productType}: Only ${available.weight} kg available.`
          });
        }
      }
    }

    // Fix category empty string to null for validation
    if (transferData.products && transferData.products.length > 0) {
      transferData.products = transferData.products.map(product => {
        if (product.category === '') {
          product.category = null;
        }
        return product;
      });
    }

    inventory.shopTransfers.push(transferData);
    inventory.calculateRemainingStock();

    await inventory.save();
    res.json(inventory);
  } catch (error) {
    console.error('Add transfer error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Update stock reconciliation
router.put('/:id/reconciliation', async (req, res) => {
  try {
    const inventory = await StoreInventory.findById(req.params.id);
    if (!inventory) {
      return res.status(404).json({ message: 'Inventory not found' });
    }
    
    inventory.stockReconciliation = req.body.reconciliation;
    inventory.calculateReconciliation();
    inventory.status = 'RECONCILED';
    
    await inventory.save();
    res.json(inventory);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

async function updateNextDayOpeningStock(previousInventory) {
  const nextDay = new Date(previousInventory.date);
  nextDay.setDate(nextDay.getDate() + 1);
  nextDay.setHours(0, 0, 0, 0);
  const nextDayEnd = new Date(nextDay);
  nextDayEnd.setHours(23, 59, 59, 999);

  let nextDayInventory = await StoreInventory.findOne({ date: { $gte: nextDay, $lt: nextDayEnd } });
  if (nextDayInventory) {
    // Update opening stock from previous day's final stock
    nextDayInventory.openingStock = (previousInventory.finalStock || []).map(item => ({
      productType: item.productType,
      pieces: item.pieces || 0,
      weight: item.weight || 0,
      pricePerUnit: 0,
      subtotal: 0,
      vatPercentage: 0,
      vatAmount: 0,
      totalCost: 0
    }));

    // Recalculate totals
    nextDayInventory.calculateTotalAvailableStock();
    nextDayInventory.calculateRemainingStock();

    await nextDayInventory.save();
  } else {
    // Create next day's inventory with opening stock from previous day's final stock
    nextDayInventory = new StoreInventory({
      date: nextDay,
      openingStock: (previousInventory.finalStock || []).map(item => ({
        productType: item.productType,
        pieces: item.pieces || 0,
        weight: item.weight || 0,
        pricePerUnit: 0,
        subtotal: 0,
        vatPercentage: 0,
        vatAmount: 0,
        totalCost: 0
      })),
      dailyPurchases: [],
      shopTransfers: [],
      status: 'DRAFT'
    });

    // Calculate initial totals
    nextDayInventory.calculateTotalAvailableStock();
    nextDayInventory.calculateRemainingStock();

    await nextDayInventory.save();
  }
}

// Finalize inventory (lock for the day)
router.put('/:id/finalize', async (req, res) => {
  try {
    const inventory = await StoreInventory.findById(req.params.id);
    if (!inventory) {
      return res.status(404).json({ message: 'Inventory not found' });
    }

    // Ensure reconciliation is complete before finalizing
    if (inventory.status !== 'RECONCILED') {
      return res.status(400).json({ message: 'Inventory must be reconciled before finalizing' });
    }

    // Ensure final stock is set from reconciliation
    if (!inventory.finalStock || inventory.finalStock.length === 0) {
      // If no final stock, use reconciliation data
      inventory.finalStock = inventory.stockReconciliation.map(recon => ({
        productType: recon.productType,
        pieces: recon.actualPieces,
        weight: recon.actualWeight,
        pricePerUnit: 0, // No pricing for final stock
        subtotal: 0,
        vatPercentage: 0,
        vatAmount: 0,
        totalCost: 0
      }));
    }

    inventory.status = 'FINALIZED';
    inventory.lastModifiedBy = req.body.userId || 'system';

    await inventory.save();

    // Update next day's opening stock from this finalized inventory
    await updateNextDayOpeningStock(inventory);

    res.json(inventory);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update shop transfer
router.put('/:id/transfers/:transferId', async (req, res) => {
  try {
    const inventory = await StoreInventory.findById(req.params.id);
    if (!inventory) {
      return res.status(404).json({ message: 'Inventory not found' });
    }

    const transfer = inventory.shopTransfers.id(req.params.transferId);
    if (!transfer) {
      return res.status(404).json({ message: 'Transfer not found' });
    }

    Object.assign(transfer, req.body);
    inventory.calculateTotalAvailableStock();
    inventory.calculateRemainingStock();

    await inventory.save();
    res.json(inventory);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete shop transfer
router.delete('/:id/transfers/:transferId', async (req, res) => {
  try {
    const inventory = await StoreInventory.findById(req.params.id);
    if (!inventory) {
      return res.status(404).json({ message: 'Inventory not found' });
    }

    // Find the transfer to delete
    const transferToDelete = inventory.shopTransfers.id(req.params.transferId);
    if (!transferToDelete) {
      return res.status(404).json({ message: 'Transfer not found' });
    }

    // Remove the transfer using pull method
    inventory.shopTransfers.pull(req.params.transferId);

    // Recalculate stocks
    inventory.calculateTotalAvailableStock();
    inventory.calculateRemainingStock();

    await inventory.save();
    res.json(inventory);
  } catch (error) {
    console.error('Delete transfer error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get inventory history (last 30 days)
router.get('/history', async (req, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const inventories = await StoreInventory.find({
      date: { $gte: thirtyDaysAgo }
    }).sort({ date: -1 });
    
    res.json(inventories);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get product types and display names
router.get('/product-types', (req, res) => {
  try {
    const productTypes = StoreInventory.getProductDisplayNames();
    res.json(productTypes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get shop types and display names
router.get('/shop-types', (req, res) => {
  try {
    const shopTypes = StoreInventory.getShopDisplayNames();
    res.json(shopTypes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update purchase
router.put('/:id/purchases/:purchaseId', async (req, res) => {
  try {
    const inventory = await StoreInventory.findById(req.params.id);
    if (!inventory) {
      return res.status(404).json({ message: 'Inventory not found' });
    }

    const purchase = inventory.dailyPurchases.id(req.params.purchaseId);
    if (!purchase) {
      return res.status(404).json({ message: 'Purchase not found' });
    }

    // Calculate VAT for updated purchase data
    const purchaseData = { ...req.body };
    let subtotal = 0;
    let totalVatAmount = 0;

    if (purchaseData.products && purchaseData.products.length > 0) {
      purchaseData.products = purchaseData.products.map(product => {
        const { weight, pricePerUnit, vatPercentage = 0 } = product;

        const productSubtotal = (pricePerUnit || 0) * (weight || 0);
        const productVatAmount = (productSubtotal * (vatPercentage || 0)) / 100;
        const productTotalCost = productSubtotal + productVatAmount;

        subtotal += productSubtotal;
        totalVatAmount += productVatAmount;

        return {
          ...product,
          subtotal: productSubtotal,
          vatAmount: productVatAmount,
          totalCost: productTotalCost
        };
      });
    }

    purchaseData.subtotal = subtotal;
    purchaseData.totalVatAmount = totalVatAmount;
    purchaseData.totalCost = subtotal + totalVatAmount;

    // Update purchase
    Object.assign(purchase, purchaseData);

    inventory.calculateTotalAvailableStock();
    inventory.calculateRemainingStock();

    await inventory.save();
    res.json(inventory);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete purchase
router.delete('/:id/purchases/:purchaseId', async (req, res) => {
  try {
    const inventory = await StoreInventory.findById(req.params.id);
    if (!inventory) {
      return res.status(404).json({ message: 'Inventory not found' });
    }

    // Find the purchase to delete
    const purchaseToDelete = inventory.dailyPurchases.id(req.params.purchaseId);
    if (!purchaseToDelete) {
      return res.status(404).json({ message: 'Purchase not found' });
    }

    // Remove the purchase using pull method
    inventory.dailyPurchases.pull(req.params.purchaseId);

    // Recalculate stocks
    inventory.calculateTotalAvailableStock();
    inventory.calculateRemainingStock();

    await inventory.save();
    res.json(inventory);
  } catch (error) {
    console.error('Delete purchase error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Force recalculation of inventory
router.put('/:id/recalculate', async (req, res) => {
  try {
    const inventory = await StoreInventory.findById(req.params.id);
    if (!inventory) {
      return res.status(404).json({ message: 'Inventory not found' });
    }

    // Force recalculation of all stocks
    inventory.calculateTotalAvailableStock();
    inventory.calculateRemainingStock();

    // If reconciliation exists, recalculate it too
    if (inventory.stockReconciliation && inventory.stockReconciliation.length > 0) {
      inventory.calculateReconciliation();
    }

    await inventory.save();
    res.json(inventory);
  } catch (error) {
    console.error('Recalculation error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get summary statistics
router.get('/stats/summary', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const start = new Date(today);
    start.setHours(0, 0, 0, 0);
    const end = new Date(today);
    end.setHours(23, 59, 59, 999);

    const todayInventory = await StoreInventory.findOne({ date: { $gte: start, $lt: end } });

    const stats = {
      todayStatus: todayInventory?.status || 'NOT_STARTED',
      totalPurchases: todayInventory?.dailyPurchases.length || 0,
      totalTransfers: todayInventory?.shopTransfers.length || 0,
      isReconciled: todayInventory?.status === 'RECONCILED' || todayInventory?.status === 'FINALIZED'
    };
    
    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Unfinalize inventory (allow editing again) - admin only
router.post('/:id/unfinalize', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const inventory = await StoreInventory.findById(req.params.id);
    if (!inventory) return res.status(404).json({ message: 'Not found' });

    // Only change the status
    inventory.status = 'DRAFT';
    await inventory.save();

    res.json(inventory); // Return the full inventory object
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
