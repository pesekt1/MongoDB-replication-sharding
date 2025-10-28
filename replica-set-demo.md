# MongoDB Replica Set: Step-by-Step Guide

> **Note:**
>
> - Commands in `bash` blocks are for your terminal or PowerShell.
> - Commands in `js` blocks are for the MongoDB shell (`mongosh`).

## 1. Start the Replica Set Containers

Open a terminal in your project directory and run:

```powershell
docker compose -f docker-compose-replicaset.yml up -d
```

---

## 2. Initialize the Replica Set

Connect to the primary node (usually `mongo1`):

```powershell
docker exec -it mongo1 mongosh
```

Initialize the replica set:

```javascript
rs.initiate({
  _id: "rs0",
  members: [
    { _id: 0, host: "mongo1:27017" },
    { _id: 1, host: "mongo2:27017" },
    { _id: 2, host: "mongo3:27017" },
  ],
});
```

---

## 3. Important Note for GUI Tools

- Map `mongo1` to port `27017` on your host for compatibility with MongoDB Compass and other GUI tools.
- If not mapped, specify the custom port in your connection settings.

---

## 4. Check Replica Set Status

```javascript
rs.status();
```

---

## 5. Insert Data into the Primary Node

Switch to your database and insert a document:

```javascript
use testDB
db.items.insertOne({ name: "hello", ts: new Date() });
```

---

## 6. Check Data on Secondary Nodes

Connect to a secondary node:

```powershell
docker exec -it mongo2 mongosh
```

```javascript
use testDB
rs.slaveOk()   // allow reads on secondary
db.items.find().pretty()
```

Repeat for `mongo3` as needed.

---

## 7. Failover Test

Check the current primary:

```javascript
rs.isMaster();
```

Stop the primary node container:

```powershell
docker stop mongo1
```

Wait for a new primary to be elected, then check status:

```javascript
rs.status();
```

Restart the old primary:

```powershell
docker start mongo1
```

Check the status again to see if it has rejoined as a secondary.

```javascript
rs.status();
```

---

## 8. Write Concern & Read Preference Example

The following example shows how to require that a write is acknowledged by the majority of replica set members (for increased data safety),

The writeConcern: { w: "majority" } option in MongoDB means that a write operation (like insertOne) will only be acknowledged as successful after the data has been written to the majority of replica set members.

How it works:

In a replica set with 3 members, "majority" means at least 2 nodes (including the primary) must confirm the write.
If the primary writes the data but a majority of nodes do not confirm (for example, if one secondary is down), the write will fail and return an error.
This increases data safety: if the primary crashes, the data is still present on at least one other node.
Summary:
"majority" write concern ensures your data is durable and protected against node failures, because it is stored on most members before the write is considered successful.

Insert requiring majority write acknowledgment:

```javascript
db.items.insertOne(
  { name: "majorityTest", ts: new Date() },
  { writeConcern: { w: "majority" } }
);
```

How to read from a secondary node (for load balancing or offloading reads from the primary).

Read from secondary:

```javascript
db.items.find().readPref("secondary").pretty();
```

---

## 9. Cleanup and Start Over

```powershell
docker compose -f docker-compose-replicaset.yml down -v
docker compose -f docker-compose-replicaset.yml up -d
```

---

## 10. Add Hostnames to Your System

To keep mongo1, mongo2, mongo3 inside the config, you can make your host aware of them by adding entries to your hosts file. This is especially useful for GUI tools that rely on these hostnames like MongoDB Compass. This was tested on Windows, but similar steps apply for macOS and Linux.

Edit your hosts file (`C:\Windows\System32\drivers\etc\hosts`) and add:

```
127.0.0.1 mongo1
127.0.0.1 mongo2
127.0.0.1 mongo3
```

---

## 11. Connect Using GUI Tools

**Replica Set Connection String:**

```
mongodb://mongo1:27017,mongo2:27018,mongo3:27019/?replicaSet=rs0
```

- This connects to the primary by default.
- To read from secondary, set the read preference in your GUI tool to `secondary` or `secondaryPreferred`.

**Read from Secondary in Shell:**

```javascript
db.getMongo().setReadPref("secondary");
db.items.find().pretty();
```

---

## 12. Connect Directly to a Secondary / or to any replica

**Connection String:**

```
mongodb://mongo2:27018/?directConnection=true
```

- Connects as secondary by default.

**Shell Command:**

```powershell
mongosh "mongodb://mongo2:27018/?directConnection=true"
```

---

## 13. DataGrip Connection

Choose connection type: "URL only" and use the following URL:

```
mongodb://mongo1:27017,mongo2:27018,mongo3:27019/?replicaSet=rs0
```

You can also connect directly to all replicas like it is shown for MongoDB Compass.

---
