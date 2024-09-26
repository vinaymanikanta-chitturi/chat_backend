const express = require("express");
const http = require("http");
const { MongoClient } = require("mongodb");
const socketIo = require("socket.io");
const cors = require("cors");

const app = express();
const server = http.createServer(app);

const io = socketIo(server, {
  cors: {
    origin: "http://localhost:1234/", // Ensure this matches the front-end URL
    methods: ["GET", "POST"],
  },
});

// MongoDB connection
const mongoURI = "mongodb://localhost:27017";
const dbName = "chat_app";
const client = new MongoClient(mongoURI, {
  useNewUrlParser: true, // Correct option name
  useUnifiedTopology: true, // Ensures stable connection
});

let db;

// Connect to MongoDB
client.connect()
  .then(() => {
    db = client.db(dbName);
    console.log("Connected to MongoDB");
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
  });

// Middleware
app.use(cors());

io.on("connection", (socket) => {
  console.log("New user connected:", socket.id);

  const chatCollection = db.collection("messages");

  // Send chat history to the newly connected client
  chatCollection.find({}).toArray((err, messages) => {
    if (err) {
      console.error("Error fetching chat history:", err);
      return;
    }
    socket.emit("chat-history", messages);
  });

  // Handle incoming messages
  socket.on("send-message", (messageData) => {
    const message = {
      user: messageData.user,
      message: messageData.message,
      timestamp: new Date(),
    };

    // Insert message into MongoDB
    chatCollection.insertOne(message, (err) => {
      if (err) {
        console.error("Error inserting message:", err);
        return;
      }

      // Broadcast the message to all connected clients
      io.emit("receive-message", message);
    });
  });

  // Handle user disconnect
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

// Start the server
const port = 4000;
server.listen(port, () => {
  console.log("Server listening on port " + port);
});
