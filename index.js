const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");
const documentRoutes = require("./routes/document");
const urlRoutes = require("./routes/url");
const youtubeRoutes = require("./routes/youtube");
const getRoutes = require("./routes/getData");
const chatRouter = require("./routes/chatRoutes");

dotenv.config();

const app = express();

// CORS setup
app.use(cors({
    origin: ['http://mohittt.me', 'https://mohittt.me','https://insight.mohittt.me'],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
}));

// Body parsers
app.use(express.json()); // handles JSON
app.use(express.urlencoded({ extended: true })); // handles URL-encoded data

// Debugging: Log incoming body
app.use((req, res, next) => {
    console.log("Incoming Request Body:", req.body);
    next();
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/document", documentRoutes);
app.use("/api/url", urlRoutes);
app.use("/api/youtube", youtubeRoutes);
app.use("/api/get", getRoutes);
app.use("/api/chat", chatRouter);

app.get("/", (req, res) => {
    return res.status(200).json({
      message: "Hello from root!",
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
