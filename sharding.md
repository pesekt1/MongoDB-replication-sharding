# Sharding demo

## run the docker compose:

```
docker compose -f docker-compose-sharding.yml up -d
```

## initialize the config server replica set:

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

```
docker exec -it mongos mongosh
sh.status()          // shows all shards and replica set members
```

## run the demo script:

exit the shell and run:

```
docker cp "./demo-sharding-full.js" mongos:/demo-sharding-full.js
```

then run:

```
docker exec -it mongos mongosh ./demo-sharding-full.js
```
