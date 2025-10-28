# Sharding demo

> **Note:**  
> This guide uses several shells:
>
> - **PowerShell/bash** for Docker commands (e.g., `docker compose`, `docker exec`, `docker cp`)
> - **mongosh** for MongoDB shell commands (e.g., `rs.initiate`, `sh.addShard`, `sh.status`)
>
> Each command block below is annotated with the shell to use.

## run the docker compose:

**Shell: PowerShell/bash**

```
docker compose -f docker-compose-sharding.yml up -d
```

## initialize the config server replica set:

**Shell: PowerShell/bash** (runs mongosh inside container)

```
docker exec -it cs1 mongosh --host cs1 --port 26050 --eval '
rs.initiate({
  _id: "configReplSet",
  configsvr: true,
  members: [
    { _id: 0, host: "cs1:26050" },
    { _id: 1, host: "cs2:26051" },
    { _id: 2, host: "cs3:26052" }
  ]
})
'
```

## initialize shard replica sets:

### connect to shard0 replica set and initialize it:

**Shell: PowerShell/bash** (runs mongosh inside container)

```
docker exec -it shard0_1 mongosh --host shard0_1 --port 27018 --eval '
rs.initiate({
  _id: "rs0",
  members: [
    { _id: 0, host: "shard0_1:27018" },
    { _id: 1, host: "shard0_2:27018" },
    { _id: 2, host: "shard0_3:27018" }
  ]
})
'
```

### connect to shard1 replica set and initialize it:

**Shell: PowerShell/bash** (runs mongosh inside container)

```
docker exec -it shard1_1 mongosh --host shard1_1 --port 27018 --eval '
rs.initiate({
  _id: "rs1",
  members: [
    { _id: 0, host: "shard1_1:27018" },
    { _id: 1, host: "shard1_2:27018" },
    { _id: 2, host: "shard1_3:27018" }
  ]
})
'
```

### connect to shard2 replica set and initialize it:

**Shell: PowerShell/bash** (runs mongosh inside container)

```
docker exec -it shard2_1 mongosh --host shard2_1 --port 27018 --eval '
rs.initiate({
  _id: "rs2",
  members: [
    { _id: 0, host: "shard2_1:27018" },
    { _id: 1, host: "shard2_2:27018" },
    { _id: 2, host: "shard2_3:27018" }
  ]
})
'
```

## connect to the mongos instance and add the shards:

**Shell: PowerShell/bash** (runs mongosh inside container)

```
docker exec -it mongos mongosh --eval '
sh.addShard("rs0/shard0_1:27018,shard0_2:27018,shard0_3:27018");
sh.addShard("rs1/shard1_1:27018,shard1_2:27018,shard1_3:27018");
sh.addShard("rs2/shard2_1:27018,shard2_2:27018,shard2_3:27018");

sh.enableSharding("testDB");
sh.shardCollection("testDB.myCollection", { shardKey: 1 });
'
```

## verify the sharding status:

**Shell: PowerShell/bash** (to enter mongosh), then **mongosh** for commands

```
docker exec -it mongos mongosh
sh.status()          // shows all shards and replica set members
```

## run the demo script:

**Shell: PowerShell/bash**

```
docker cp "./demo-sharding-full.js" mongos:/demo-sharding-full.js
```

**Shell: PowerShell/bash**

```
docker exec -it mongos mongosh ./demo-sharding-full.js
```

now in mongosh we can check the sh.status() to see the chunks distribution across the shards.

## Another demo: mongoCities100000.json

enable sharding on a new database and collection - distribute cities collection on the "name" field:

**Shell: mongosh** (connected to mongos)

```
sh.enableSharding("geoDB");
use geoDB;
db.cities.createIndex({ name: 1 })
sh.shardCollection("geoDB.cities", { name: 1 });
```

leave the mongosh shell.

**Shell: PowerShell/bash**

```
docker cp "./mongoCities100000.json" mongos:/mongoCities100000.json
```

import the data:

**Shell: PowerShell/bash**

```
docker exec -i mongos mongoimport \
  --db geoDB \
  --collection cities \
  --file ./mongoCities100000.json \
  --jsonArray
```

It is still too small dataset so its all in one chkunk on one shard.

Manually split the chunk in two:

**Shell: mongosh** (connected to mongos)

```
print("Splitting chunks manually by first letter...");

// Split chunks based on first letter ranges
sh.splitAt("geoDB.cities", { name: "A" });
sh.splitAt("geoDB.cities", { name: "G" });
sh.splitAt("geoDB.cities", { name: "M" });
sh.splitAt("geoDB.cities", { name: "S" });
sh.splitAt("geoDB.cities", { name: "Z" });

// Move chunks to specific shards
print("Moving chunks to different shards...");

sh.moveChunk("geoDB.cities", { name: "B" }, "rs0");
sh.moveChunk("geoDB.cities", { name: "H" }, "rs1");
sh.moveChunk("geoDB.cities", { name: "N" }, "rs2");
sh.moveChunk("geoDB.cities", { name: "T" }, "rs0");
```
