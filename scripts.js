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
