const mongoose = require('mongoose');
const StoreInventory = require('../models/StoreInventory');

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/meatshop';

async function cleanupDuplicateDrafts() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    console.log('Finding duplicate dates...');
    const duplicates = await StoreInventory.findDuplicateDates();
    
    if (duplicates.length === 0) {
      console.log('No duplicate dates found!');
      return;
    }

    console.log(`Found ${duplicates.length} duplicate dates:`);
    duplicates.forEach(dup => {
      console.log(`- Date: ${dup._id.toISOString().split('T')[0]}`);
      console.log(`  Entries: ${dup.entries.map(e => `${e.status} (${e._id})`).join(', ')}`);
    });

    console.log('\nCleaning up duplicate drafts...');
    const cleanedCount = await StoreInventory.cleanupDuplicateDrafts();
    console.log(`Successfully cleaned up ${cleanedCount} duplicate draft entries`);

    // Show remaining duplicates (if any)
    const remaining = await StoreInventory.findDuplicateDates();
    if (remaining.length > 0) {
      console.log('\nRemaining duplicates (manual review needed):');
      remaining.forEach(dup => {
        console.log(`- Date: ${dup._id.toISOString().split('T')[0]}`);
        console.log(`  Entries: ${dup.entries.map(e => `${e.status} (${e._id})`).join(', ')}`);
      });
    } else {
      console.log('\nAll duplicate drafts have been cleaned up!');
    }

  } catch (error) {
    console.error('Error during cleanup:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the cleanup
if (require.main === module) {
  cleanupDuplicateDrafts();
}

module.exports = { cleanupDuplicateDrafts };
