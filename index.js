const express = require("express");
const http = require("http");
const dotenv = require("dotenv");
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");
const documentRoutes = require("./routes/document");
const urlRoutes = require("./routes/url");
const youtubeRoutes = require("./routes/youtube");
dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/document", documentRoutes);
app.use("/api/url", urlRoutes);
app.use("/api/youtube", youtubeRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));