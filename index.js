const { MongoClient, ServerApiVersion } = require('mongodb');
const express = require('express');
const cors = require('cors');
require('dotenv').config();
const port = process.env.PORT || 5000;

const app = express();
app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.9ghd59u.mongodb.net/?appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    await client.connect();

    const database = client.db('bloodDonationDB');
    const userCollections = database.collection('user');
    const donationRequests = database.collection('donationRequest');
    

    app.post('/users', async (req, res) => {
      const user = req.body;
      user.role = "donor";
      user.status = "active";
      const date = new Date();
      user.createdAt = date;
      // console.log(user)
      const result = await userCollections.insertOne(user);
      res.send(result);
    })

    //add blood donation request
    app.post('/create-donation-request', async (req, res) => {
      const data = req.body;
      const date = new Date();
      data.createdAt = date;
      // console.log(data)
      const result = await donationRequests.insertOne(data);
      res.send(result);

    })

    app.get('/my-donation-request', async (req, res) => {
       const { email } = req.query
      const query = { requesterEmail: email };
      const result = await donationRequests.find(query).toArray();
      res.send(result);
     })
   
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('Hello , Developers')
})
app.listen(port, () => {
  console.log(`server is running on ${port}`);
})