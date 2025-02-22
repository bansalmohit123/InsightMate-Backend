const prisma = require("../config/db");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const axios = require("axios");
const cheerio = require("cheerio");

const { GoogleGenerativeAIEmbeddings } = require("@langchain/google-genai");
const embeddingModel = new GoogleGenerativeAIEmbeddings({
  model: "models/embedding-001",
  apiKey: process.env.GEMINI_API_KEY,
});

require("dotenv").config();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const vectorToBytes = (vector) => Buffer.from(new Float32Array(vector).buffer);

// **Function to Extract Text from URL**
async function extractTextFromURL(url) {
    try {
      console.log(`Fetching content from URL: ${url}`);
      
      // 🔹 Fetch the webpage
      const { data } = await axios.get(url, { timeout: 10000 });
  
      // 🔹 Load HTML into Cheerio
      const $ = cheerio.load(data);
  
      // 🔹 Extract text from paragraphs
      let content = $("p")
        .map((i, el) => $(el).text())
        .get()
        .join("\n");
  
      return content.trim() || "No readable text found on the page.";
    } catch (error) {
      console.error("Error Fetching URL:", error);
      throw new Error("Failed to extract content from the URL.");
    }
  }

// **Function to Save Extracted Content in Database**
async function saveURLContent(url, userId,title,description) {
    // 🔹 Extract text from the webpage
    const content = await extractTextFromURL(url);
  
    // 🔹 Generate embedding for the extracted content
    const [embeddingVector] = await embeddingModel.embedDocuments([content]);
  
    // 🔹 Store in Prisma Database
    const savedDocument = await prisma.uRLDocument.create({
      data: {
        url,
        content,
        embedding: vectorToBytes(embeddingVector),
        title: title,
        description: description,
        User: { // Note the capital "U" matching the field name in the schema
            connect: { id: userId },
          },
      },
    });
  
    return savedDocument;
  }

  const uploadURL = async (req, res) => {
    try {
      const { url ,title,description,userId} = req.body;
      if (!url) {
        return res.status(400).json({ error: "URL is required" });
      }
  
      // 🔹 Save the extracted content
      
      const savedDocument = await saveURLContent(url,userId,title,description);
  
      res.json({
        message: "URL content extracted and stored successfully",
        id: savedDocument.id,
        title:title,
        description:description,
        weburl: url,
      });
    } catch (error) {
      console.error("Error Processing URL:", error);
      res.status(500).json({ error: "Error processing URL" });
    }
  };
  

  const bytesToVector = (bytes) => Array.from(new Float32Array(bytes));

async function searchURLContent(queryEmbedding, k = 3, urlId = null) {
    let values;
    if(urlId){
        const query = `
        SELECT id, url, content
        FROM "URLDocument"
        WHERE id = $3
        ORDER BY embedding <=> $1::vector
        LIMIT $2
        `;
        values = [queryEmbedding, k, urlId];
    }
    else{
        const query = `
        SELECT id, url, content
        FROM "URLDocument"
        ORDER BY embedding <=> $1::vector
        LIMIT $2
        `;
        values = [queryEmbedding, k];
    }


  try {
    const results = await prisma.$queryRaw(query, ...values);
    return results;
  } catch (error) {
    console.error("Error Searching URL Content:", error);
    throw new Error("Failed to retrieve similar web content.");
  }
}
async function callGeminiAPI(prompt) {
    try {
      console.log("Sending request to Gemini API...");
  
      // Select the Gemini model (use "gemini-pro" for text-based queries)
      const model = genAI.getGenerativeModel({ model: "gemini-pro" });
  
      // Send the prompt to Gemini
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
  
      if (!text) {
        throw new Error("Gemini API returned an empty response.");
      }
  
      console.log("Gemini API Response:", text);
      return text;
    } catch (error) {
      console.error("Error Calling Gemini API:", error);
      return "I couldn't process your request due to an error with the Gemini API.";
    }
  }

const queryURL = async (req, res) => {
    try {
      const { question, urlId } = req.body;
      if (!question) {
        return res.status(400).json({ error: "Question is required" });
      }
  
      let contextText = "";
  
      if (urlId) {
        // 🔹 Fetch stored content by URL ID
        const doc = await prisma.uRLDocument.findUnique({
          where: { id: urlId },
          select: { content: true },
        });
  
        if (!doc) {
          return res.status(404).json({ error: "Web content not found" });
        }
  
        contextText = doc.content;
      } else {
        // 🔹 Convert the user query into an embedding
        const [queryEmbedding] = await embeddingModel.embedDocuments([question]);
  
        // 🔹 Retrieve the most relevant web content
        const docs = await searchURLContent(queryEmbedding, 3,urlId);
  
        // 🔹 Combine retrieved web content into context
        contextText = docs.map((doc) => doc.content).join("\n---\n");
      }
  
      // 🔹 Build prompt for Gemini
      const prompt = `Context:\n${contextText}\n\nQuestion: ${question}\nAnswer (based solely on the context):`;
  
      // 🔹 Generate answer from Gemini API
      const answer = await callGeminiAPI(prompt);
  
      console.log(answer);
      res.json({
        answer,
        contextSource: urlId ? `Web Content ID: ${urlId}` : "Top retrieved web pages",
      });
    } catch (error) {
      console.error("Error Processing Query:", error);
      res.status(500).json({ error: "Error processing query" });
    }
  };

  module.exports = {
    uploadURL,
    queryURL,
  };