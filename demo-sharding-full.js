// Use testDB
//use testDB;

// Get database handle
const db = db.getSiblingDB("testDB");

// Drop collection if it exists
db.myCollection.drop();

// Ensure sharding is enabled
sh.enableSharding("testDB");

// Shard the collection on shardKey
sh.shardCollection("testDB.myCollection", { shardKey: 1 });

// Insert 30 documents with shardKey 1-30
for (let i = 1; i <= 30; i++) {
  db.myCollection.insertOne({ shardKey: i, value: `Document ${i}` });
}

// Split chunks manually to distribute
sh.splitAt("testDB.myCollection", { shardKey: 10 });
sh.splitAt("testDB.myCollection", { shardKey: 20 });

// Move chunks to different shards
sh.moveChunk("testDB.myCollection", { shardKey: 5 }, "rs0");
sh.moveChunk("testDB.myCollection", { shardKey: 15 }, "rs1");
sh.moveChunk("testDB.myCollection", { shardKey: 25 }, "rs2");

// Show status
print("=== Shard Distribution ===");
sh.status();

// Verify documents
print("=== Sample Documents ===");
db.myCollection
  .find()
  .sort({ shardKey: 1 })
  .forEach((doc) => printjson(doc));
