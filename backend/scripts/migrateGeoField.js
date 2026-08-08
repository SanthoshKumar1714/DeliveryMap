require('dotenv').config();
const mongoose = require('mongoose');
const Location = require('../src/models/Location'); // adjust path if your models folder differs

async function migrate() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected to MongoDB');

  const locations = await Location.find({
    $or: [{ geo: { $exists: false } }, { 'geo.coordinates': [0, 0] }],
  });

  console.log(`Found ${locations.length} locations to migrate`);

  let updated = 0;
  for (const loc of locations) {
    loc.geo = { type: 'Point', coordinates: [loc.lng, loc.lat] };
    await loc.save();
    updated++;
  }

  console.log(`✅ Migrated ${updated} locations`);
  await mongoose.disconnect();
  process.exit(0);
}

migrate().catch((err) => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});