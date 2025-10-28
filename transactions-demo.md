# 🧩 MongoDB Replica Set Transaction Demos (Docker Setup)

> **Note:**
>
> - Commands in `bash` blocks are for your terminal or PowerShell.
> - Commands in `js` blocks are for the MongoDB shell (`mongosh`).

This guide demonstrates various transaction scenarios, including commits, rollbacks, replication, and failover handling. You need a MongoDB replica set running in Docker.

## 1️⃣ Verify the Replica Set

After starting with:

```bash
docker-compose -f docker-compose-replicaset.yml up -d
```

Connect to the primary:

```bash
docker exec -it mongo1 mongosh
```

Check status:

```js
rs.status();
```

If not initiated, run:

```js
rs.initiate({
  _id: "rs0",
  members: [
    { _id: 0, host: "mongo1:27017" },
    { _id: 1, host: "mongo2:27017" },
    { _id: 2, host: "mongo3:27017" },
  ],
});
```

✅ You should see `mongo1` as PRIMARY and the others as SECONDARY.

---

## 2️⃣ Create a Sample Database

```js
use bank;
db.accounts.insertMany([
  { _id: "Alice", balance: 500 },
  { _id: "Bob", balance: 300 }
]);
```

---

## 3️⃣ Basic Transaction Demo

```js
session = db.getMongo().startSession();
session.startTransaction();

accounts = session.getDatabase("bank").accounts;

accounts.updateOne({ _id: "Alice" }, { $inc: { balance: -100 } });
accounts.updateOne({ _id: "Bob" }, { $inc: { balance: +100 } });

// Still uncommitted
accounts.find();
```

Open another terminal:

```bash
docker exec -it mongo1 mongosh
use bank;
db.accounts.find();
```

👉 Still shows old balances.

Now commit:

```js
session.commitTransaction();
```

Re-check:

```js
db.accounts.find();
```

✅ Balances updated.

---

## 4️⃣ Rollback on Error (Atomicity Demo)

```js
session = db.getMongo().startSession();
session.startTransaction();

accounts = session.getDatabase("bank").accounts;
accounts.updateOne({ _id: "Alice" }, { $inc: { balance: -50 } });

// Invalid operation to trigger error
session.getDatabase("bank").nonexistent.insertOne({ test: 1 });

try {
  session.commitTransaction();
} catch (e) {
  print("Transaction failed:", e);
  session.abortTransaction();
}
```

Check:

```js
db.accounts.find();
```

✅ No changes applied — rollback succeeded.

---

## 5️⃣ Verify Replication Across Nodes

Commit a new transaction:

```js
session = db.getMongo().startSession();
session.startTransaction();
session
  .getDatabase("bank")
  .accounts.updateOne({ _id: "Alice" }, { $inc: { balance: 10 } });
session.commitTransaction();
```

Now check a secondary:

```bash
docker exec -it mongo2 mongosh
```

Enable read mode:

```js
rs.slaveOk();
use bank;
db.accounts.find();
```

✅ The updated balance appears on the secondary too.

---

## 6️⃣ Simulate Failover During a Transaction

Start a transaction on the primary:

```js
session = db.getMongo().startSession();
session.startTransaction();

accounts = session.getDatabase("bank").accounts;
accounts.updateOne({ _id: "Alice" }, { $inc: { balance: -200 } });
accounts.updateOne({ _id: "Bob" }, { $inc: { balance: 200 } });

// Leave open, don't commit yet
```

Force a failover from another terminal:

```bash
docker exec -it mongo2 mongosh
rs.stepUp();
```

Back in your transaction shell, try:

```js
session.commitTransaction();
```

You’ll get an error like:

```
TransientTransactionError: primary stepped down
```

Check balances:

```js
db.accounts.find();
```

✅ No changes — MongoDB rolled back the uncommitted transaction.

---

## 7️⃣ Inspect Rollback Files (Advanced)

On the stepped-down node:

```bash
docker exec -it mongo1 bash
ls /data/db/rollback
```

If a rollback occurred, BSON files appear there.

---

## 8️⃣ Inspect the Oplog

```bash
docker exec -it mongo1 mongosh
use local
db.oplog.rs.find({ op: "c" }).sort({ $natural: -1 }).limit(1).pretty();
```

Example entry:

```js
{
  "op": "c",
  "ns": "bank.$cmd",
  "o": {
    "applyOps": [
      { "op": "u", "ns": "bank.accounts", "o2": { "_id": "Alice" }, "o": { "$inc": { balance: -200 } } },
      { "op": "u", "ns": "bank.accounts", "o2": { "_id": "Bob" }, "o": { "$inc": { balance: 200 } } }
    ]
  }
}
```

That single `applyOps` represents your atomic transaction.

---

## 9️⃣ Node.js Example (Optional)

Connection URI:

```js
const uri = "mongodb://mongo1:27017,mongo2:27017,mongo3:27017/?replicaSet=rs0";
```

Transaction:

```js
import { MongoClient } from "mongodb";

const client = new MongoClient(uri);

async function demoTransaction() {
  await client.connect();
  const session = client.startSession();

  try {
    await session.withTransaction(
      async () => {
        const accounts = client.db("bank").collection("accounts");
        await accounts.updateOne(
          { _id: "Alice" },
          { $inc: { balance: -100 } },
          { session }
        );
        await accounts.updateOne(
          { _id: "Bob" },
          { $inc: { balance: +100 } },
          { session }
        );
      },
      {
        readConcern: { level: "snapshot" },
        writeConcern: { w: "majority" },
      }
    );

    console.log("Transaction committed.");
  } catch (err) {
    console.error("Transaction aborted:", err);
  } finally {
    await session.endSession();
    await client.close();
  }
}

demoTransaction();
```

---

## 🔍 10️⃣ Summary of Demos

| Demo                   | What It Shows                      | How                           |
| ---------------------- | ---------------------------------- | ----------------------------- |
| ✅ Basic Transaction   | Atomic commit                      | Two updates + commit          |
| ❌ Rollback on Error   | Atomic rollback                    | One valid + one invalid op    |
| 🔁 Replica Propagation | Durability                         | Commit → read from secondary  |
| ⚡ Failover Recovery   | Transaction rollback + re-election | `rs.stepUp()` mid-transaction |
| 🔍 Inspect Oplog       | Internal transaction entry         | `db.oplog.rs.find()`          |
| 📂 Rollback Files      | Physical rollback inspection       | `/data/db/rollback/`          |

---
