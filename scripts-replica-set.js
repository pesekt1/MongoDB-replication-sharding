//start the replica set containers:
//docker compose -f docker-compose-replicaset.yml up -d

// Initialize the Replica Set:

//connect to the primary node (usually mongo1):
// docker exec -it mongo1 mongosh

//initialize:
rs.initiate({
  _id: "rs0",
  members: [
    { _id: 0, host: "mongo1:27017" },
    { _id: 1, host: "mongo2:27017" },
    { _id: 2, host: "mongo3:27017" },
  ],
});

//NOTE: It is crucial to map mongo1 to port 27017 on the host machine if you want to use MongoDB Compass
// or other GUI tools to connect to the replica set.
// This is because most GUI tools default to connecting to port 27017.
// If mongo1 is not mapped to this port,
// you will need to specify the custom port in your connection settings.

//check status:
rs.status();

//insert data into the primary node:
//use testDB

db.items.insertOne({ name: "hello", ts: new Date() });

//check data on secondary nodes:
// docker exec -it mongo2 mongosh
// use testDB
// rs.slaveOk()   // allow reads on secondary
// db.items.find().pretty()

// docker exec -it mongo3 mongosh
// use testDB
// rs.slaveOk()   // allow reads on secondary
// db.items.find().pretty()

//Failover Test
//Check the current primary:
rs.isMaster();

//Stop the primary node container (e.g., mongo1):
// docker stop mongo1
//Wait for a new primary to be elected (check status):
rs.status();

//Restart the old primary:
// docker start mongo1
//Check the status again to see if it has rejoined as a secondary:
rs.status();

//Write Concern / Read Preference Example
//From mongosh:
// Insert requiring majority write acknowledgment
db.items.insertOne(
  { name: "majorityTest", ts: new Date() },
  { writeConcern: { w: "majority" } }
);

// Read from secondary
db.items.find().readPref("secondary").pretty();

//cleanup and start over:
//docker compose -f docker-compose-replicaset.yml down -v
//docker compose -f docker-compose-replicaset.yml up -d

// Add hostnames to your system

// If you prefer to keep mongo1, mongo2, mongo3 inside the config, you can trick your host into knowing them:

// Edit your hosts file (C:\Windows\System32\drivers\etc\hosts on Windows).

// Add:

// 127.0.0.1 mongo1
// 127.0.0.1 mongo2
// 127.0.0.1 mongo3

//connect to replica set using MongoDB Compass or another GUI tool:
//connection string: mongodb://mongo1:27017,mongo2:27018,mongo3:27019/?replicaSet=rs0

//This will connect to the primary by default.
//To read from secondary, set the read preference in the GUI tool to "secondary" or "secondaryPreferred".
db.getMongo().setReadPref("secondary");

db.items.find().pretty(); //reads from secondary

// connect the secondary directly (e.g., mongo2):
// connection string: mongodb://mongo2:27018/?directConnection=true
// it will connect as secondary by default
db.items.find().pretty(); //reads from secondary

//connecting directly using mongosh:
// mongosh "mongodb://mongo2:27018/?directConnection=true"

//DataGrip connection:
//choose connection type: only useImperativeHandle(
//connection string: mongodb://mongo1:27017,mongo2:27018,mongo3:27019/?replicaSet=rs0
