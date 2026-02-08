const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const express = require('express');
const cors = require('cors');
require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET);
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
  },
});

async function run() {
  try {
    // await client.connect();

    const database = client.db('bloodDonationDB');
    const userCollections = database.collection('user');
    const donorCollections = database.collection('donor');
    const allFunding = database.collection('funding');
    const donationRequests = database.collection('donationRequest');

    app.post('/users', async (req, res) => {
      const user = req.body;
      user.role = 'donor';
      user.status = 'active';
      const date = new Date();
      user.createdAt = date;
      // console.log(user)
      const result = await userCollections.insertOne(user);
      res.send(result);
    });

    //get all users
    app.get('/users', async (req, res) => {
      const result = await userCollections.find().toArray();
      res.status(200).send(result);
    });

    app.post('/allFunding', async (req, res) => {
      const funding = req.body;
      const date = new Date();
      user.createdAt = date;
      const result = await allFunding.insertOne(funding);
      res.send(result);
    });

    //get all funding
    app.get('/allFunding', async (req, res) => {
      const result = await funding.find().toArray();
      res.status(200).send(result);
    });

    //add blood donation request
    app.post('/create-donation-request', async (req, res) => {
      const data = req.body;
      const date = new Date();
      data.createdAt = date;
      // console.log(data)
      const result = await donationRequests.insertOne(data);
      res.send(result);
    });

    //get all request
    app.get('/all-donation-request', async (req, res) => {
      const result = await donationRequests.find().toArray();
      res.status(200).send(result);
    });

    //get users role
    app.get('/users/role/:email', async (req, res) => {
      const { email } = req.params;
      const query = { email: email };
      const result = await userCollections.findOne(query);
      res.send(result);
    });

    //update status
    app.patch('/user/update/status', async (req, res) => {
      const { email, status } = req.query;
      const query = { email: email };

      const updateStatus = {
        $set: {
          status: status,
        },
      };
      const result = await userCollections.updateOne(query, updateStatus);
      res.send(result);
    });
    //update role
    app.patch('/user/update/role', async (req, res) => {
      const { email, role } = req.query;
      const query = { email: email };

      const updateRole = {
        $set: {
          role: role,
        },
      };
      const result = await userCollections.updateOne(query, updateRole);
      res.send(result);
    });

    // app.get('/users/by-email', async (req, res) => {
    //   const { email } = req.query;
    //   const result = await userCollections.findOne({ email });
    //   res.send(result);
    // })

    //get my donation request
    app.get('/my-donation-request', async (req, res) => {
      const { email } = req.query;
      const query = { requesterEmail: email };
      const result = await donationRequests.find(query).toArray();
      res.send(result);
    });

    app.get('/my-donation-request/:id', async (req, res) => {
      const { id } = req.params;
      const query = { _id: new ObjectId(id) };
      const result = await donationRequests.findOne(query);
      console.log(result);
      res.send(result);
    });

    //post who want to donate blood
    app.post('/donor', async (req, res) => {
      const donor = req.body;

      const date = new Date();
      user.createdAt = date;
      // console.log(user)
      const result = await donorCollections.insertOne(donor);
      res.send(result);
    });

    app.patch('/all-donation-request/:id', async (req, res) => {
      const { id } = req.params;
      console.log(id);
      const query = { _id: new ObjectId(id) };

      const updateDonationStatus = {
        $set: {
          donationStatus: 'Inprogress',
        },
      };
      const result = await donationRequests.updateOne(
        query,
        updateDonationStatus,
      );
      res.send(result);
    });

    // GET /donors?bloodGroup=A+&district=Dhaka&upazila=Savar
    app.get('/user', async (req, res) => {
      const { bloodGroup, district, upazila } = req.query;
      // console.log(req.query);
      const query = {
        bloodGroup,
        district,
        upazila,
        status: 'active',
      };

      const result = await userCollections.find(query).toArray();
      // console.log(result);
      res.send(result);
    });

    //PAYMENT RELATED APIS

    app.post('/create-checkout-session', async (req, res) => {
      const fundingInfo = req.body;
      const amount = parseInt(fundingInfo.money) * 100;
      const session = await stripe.checkout.sessions.create({
        line_items: [
          {
            price_data: {
              currency: 'usd',
              unit_amount: amount,

              product_data: {
                name: 'Fund for Organization',
              },
            },
            quantity: 1,
          },
        ],
        customer_email: fundingInfo.senderEmail,
        mode: 'payment',
        metadata: {
          type: 'funding',
          userId: fundingInfo.userId,
          userName: fundingInfo.userName,
        },
        success_url: `${process.env.SITE_DOMAIN}/dashboard/funding-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.SITE_DOMAIN}/dashboard/funding-cancelled`,
      });
      console.log('session',session.url)
      res.send({url:session.url})
    });

    // await client.db("admin").command({ ping: 1 });
    console.log(
      'Pinged your deployment. You successfully connected to MongoDB!',
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('Hello , Developers');
});
app.listen(port, () => {
  console.log(`server is running on ${port}`);
});
