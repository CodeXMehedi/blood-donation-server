const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const express = require('express');
const cors = require('cors');
require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET);
const port = process.env.PORT || 5000;

const app = express();
app.use(cors());
app.use(express.json());
const admin = require('firebase-admin');

const serviceAccount = require('./blood-donation-59bc0-firebase-admin.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const verifyFBToken = async (req, res, next) => {
  // console.log('headers in middleware', req.headers?.authorization);

  const token = req.headers?.authorization;
  if (!token) {
    return res.status(401).send({ message: 'unauthorized access' });
  }
  try {
    const idToken = token.split(' ')[1];
    const decoded = await admin.auth().verifyIdToken(idToken);
    // console.log('decoded in the token', decoded);
    req.decoded_email = decoded.email;
    next();
  } catch (err) {
    return res.status(401).send({ message: 'unauthorized access' });
  }
};

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
//store users data
    app.post('/users',verifyFBToken , async (req, res) => {
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
    app.get('/users', verifyFBToken, async (req, res) => {
      const result = await userCollections.find().toArray();
      res.status(200).send(result);
    });

    // app.post('/allFunding', async (req, res) => {
    //   const funding = req.body;
    //   const date = new Date();
    //   user.createdAt = date;
    //   const result = await allFunding.insertOne(funding);
    //   res.send(result);
    // });

    // //get all funding
    // app.get('/allFunding', async (req, res) => {
    //   const result = await funding.find().toArray();
    //   res.status(200).send(result);
    // });

    //add blood donation request
    app.post('/create-donation-request',verifyFBToken, async (req, res) => {
      const data = req.body;
      // console.log(data);
      const date = new Date();
      data.createdAt = date;
      // console.log(data)
      const result = await donationRequests.insertOne(data);
      res.send(result);
    });

    //get all request
    app.get( '/all-donation-request', async (req, res) => {
       const {
         limit = 0,
         skip = 0,
         
      } = req.query;
      console.log(req.query)
      const result = await donationRequests
        .find()
        .limit(Number(limit))
        .skip(Number(skip))
        .toArray();
      // const total = await donationRequests.countDocuments();
        res.status(200).send(result);
    });

    //get users role
    app.get('/users/role/:email',verifyFBToken, async (req, res) => {
      const { email } = req.params;
      const query = { email: email };
      const result = await userCollections.findOne(query);
      res.send(result);
    });

    app.get( '/users/by-email', async (req, res) => {
      const { email } = req.query;
      const query = { email: email };
      const result = await userCollections.findOne(query);
      res.send(result);
    });


     app.patch('/users/update', async (req, res) => {
         const { id } = req.query;
         const updateUserData = req.body;
        //  console.log(updateUserData);
         const query = {
           _id: new ObjectId(id),
         };

         const result = await userCollections.updateOne(query, {
           $set: updateUserData,
         });
        //  console.log(result);
         res.send(result);
       },
     );

    //update status
    app.patch('/user/update/status',verifyFBToken, async (req, res) => {
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
    app.patch('/user/update/role',verifyFBToken, async (req, res) => {
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

    app.get('/my-donation-request',verifyFBToken, async (req, res) => {
      const { email } = req.query;
      const query = { requesterEmail: email };
      const result = await donationRequests
        .find(query)
        .sort({ createdAt: -1 })
        .toArray();
      res.send(result);
    });

    app.get('/my-donation-request/:id',verifyFBToken, async (req, res) => {
      const { id } = req.params;
      const query = { _id: new ObjectId(id) };
      const result = await donationRequests.findOne(query);
      // console.log(result);
      res.send(result);
    });

    app.patch('/my-donation-request/update',verifyFBToken, async (req, res) => {
      const { id } = req.query;
      const donationRequestData = req.body;
      // console.log(donationRequestData);
      const query = {
        _id: new ObjectId(id),
      };

      //  const updateBloodRequest = {
      //    $set: {
      //      donationRequestData,
      //    },
      //  };
      const result = await donationRequests.updateOne(query, {
        $set: donationRequestData,
      });
      // console.log(result);
      res.send(result);
    });
 app.patch('/all-donation-request/update/:id',verifyFBToken, async (req, res) => {
   const { id } = req.params;
  //  console.log(id);
   const query = { _id: new ObjectId(id) };

   const updateDonationStatus = {
     $set: {
       donationStatus: 'Inprogress',
     },
   };
   const result = await donationRequests.updateOne(query, updateDonationStatus);
   res.send(result);
 });
    app.patch('/my-donation-request/status',verifyFBToken, async (req, res) => {
      const { id, donationStatus } = req.query;
      const query = {
        _id: new ObjectId(id),
      };

      const updateDonationStatus = {
        $set: {
          donationStatus: donationStatus,
        },
      };
      const result = await donationRequests.updateOne(
        query,
        updateDonationStatus,
      );
      res.send(result);
      res.send({ success: true });
    });

    app.delete('/my-donation-request/delete',verifyFBToken, async (req, res) => {
      const id = req.query.id;

      const result = await donationRequests.deleteOne({
        _id: new ObjectId(id),
      });
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

    app.patch('/all-donation-request/status',verifyFBToken, async (req, res) => {
      const { id, donationStatus } = req.query;

      if (!ObjectId.isValid(id)) {
        return res.status(400).send({ error: 'Invalid ID' });
      }

      const query = { _id: new ObjectId(id) };

      const updateDonationStatus = {
        $set: {
          donationStatus: donationStatus,
        },
      };

      const result = await donationRequests.updateOne(
        query,
        updateDonationStatus,
      );

      res.send(result);
    });
    app.delete('/all-donation-request/delete',verifyFBToken, async (req, res) => {
      const id = req.query.id;

      const result = await donationRequests.deleteOne({
        _id: new ObjectId(id),
      });
      res.send(result);
    });

    // GET /donors?bloodGroup=A+&district=Dhaka&upazila=Savar
    app.get('/user',verifyFBToken, async (req, res) => {
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
      // console.log(fundingInfo);
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
          userName: fundingInfo.userName,
          userId: fundingInfo.userId,
        },
        success_url: `${process.env.SITE_DOMAIN}/funding/funding-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.SITE_DOMAIN}/funding/funding-cancelled`,
      });
      // console.log('session',session)
      res.send({ url: session.url });
    });

    app.post('/funding', async (req, res) => {
      const sessionId = req.query.session_id;
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      // console.log('session retrived', session);

      const transactionId = session.payment_intent;
      const query = { transactionId: transactionId };
      const fundExist = await allFunding.findOne(query);

      if (fundExist) {
        return res.send({ message: 'already exists', transactionId });
      }
      const created = session.created;
      const dateTime = new Date(created * 1000);

      const fund = {
        name: session.metadata.userName,
        amount: session.amount_total / 100,
        dateTime: dateTime,
        transactionId: session.payment_intent,
        // fundingAt: new Date()
      };
      // console.log(fund)
      const result = await allFunding.insertOne(fund);

      res.send({ success: true });
    });

    app.get('/funding',  async (req, res) => {
      //  if (email !== req.decoded_email) {
      //    return res.status(403).send({ message: 'forbidden access ' });
      //  }
      const result = await allFunding.find().sort({ dateTime: -1 }).toArray();
      res.status(200).send(result);
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
