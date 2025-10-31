const express = require("express");
require('dotenv').config();
const connectDB = require("./config/mongodb"); 
const userRoutes = require("./routes/userRoutes");

const app = express();

app.use(express.json());

connectDB();

app.use('/api/users', userRoutes);

app.get("/", (req, res) => {
  res.send("API is running");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
