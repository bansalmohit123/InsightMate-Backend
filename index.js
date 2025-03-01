const express = require("express");
const http = require("http");
const dotenv = require("dotenv");
const cors = require("cors");
const bodyParser = require('body-parser');
const serverless = require('serverless-http');
const authRoutes = require("./routes/authRoutes");
const documentRoutes = require("./routes/document");
const urlRoutes = require("./routes/url");
const youtubeRoutes = require("./routes/youtube");
const getRoutes = require("./routes/getData");
const chatRouter = require("./routes/chatRoutes");
dotenv.config();
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors({
    origin: '*'
}));
// Middleware
app.use(bodyParser.json());
app.use("/api/auth", authRoutes);
app.use("/api/document", documentRoutes);
app.use("/api/url", urlRoutes);
app.use("/api/youtube", youtubeRoutes);
app.use("/api/get", getRoutes);
app.use("/api/chat", chatRouter);
app.get('/', (req, res) => {
    res.send('Hello, world!');
});
const PORT = process.env.PORT || 3000;
// app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
module.exports.handler= serverless(app);