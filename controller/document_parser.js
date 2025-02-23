
const pdfParse = require("pdf-parse");
const csvParser = require("csv-parser");
const mammoth = require("mammoth");
const xlsx = require("xlsx");
const fs = require("fs");
const fetch = require("node-fetch"); // For Gemini API calls
const { GoogleGenerativeAIEmbeddings } = require("@langchain/google-genai");
const prisma = require("../config/db");
const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

// Initialize GoogleGenerativeAIEmbeddings
const embeddingModel = new GoogleGenerativeAIEmbeddings({
  model: "models/embedding-001",
  apiKey: process.env.GEMINI_API_KEY, // Ensure this is set in .env
});
// Initialize Gemini API with your API key
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// **Helper Functions: Convert Embeddings for Prisma Storage**
const vectorToBytes = (vector) => Buffer.from(new Float32Array(vector).buffer);
const bytesToVector = (bytes) => Array.from(new Float32Array(bytes));

// **Function to Save Document and Embedding**
async function saveDocument(docText, embeddingVector, userId,title,description) {
  const doc = await prisma.document.create({
    data: {
      content: docText,
      embedding: vectorToBytes(embeddingVector), // Store as bytes for Prisma
      title: title,
      description: description,
      // userId: userId, // Prisma requires direct foreign key, not relation object
          User: { // Note the capital "U" matching the field name in the schema
        connect: { id: userId },
      },
    },
  });
  return doc.id;
}
// **Function to Extract Text from Different File Types**
async function extractText(file) {
  const fileType = file.mimetype;

  if (fileType === "application/pdf") {
    // 📄 Extract text from PDF
    const pdfData = await pdfParse(file.buffer);
    return pdfData.text;
  }

  if (fileType === "text/csv") {
    // 📊 Extract text from CSV
    return new Promise((resolve, reject) => {
      let text = "";
      const stream = require("stream");
      const bufferStream = new stream.PassThrough();
      bufferStream.end(file.buffer);

      bufferStream
        .pipe(csvParser())
        .on("data", (row) => {
          text += Object.values(row).join(" ") + "\n";
        })
        .on("end", () => resolve(text))
        .on("error", reject);
    });
  }

  if (fileType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    // 📄 Extract text from DOCX
    const result = await mammoth.extractRawText({ buffer: file.buffer });
    return result.value;
  }

  if (fileType === "text/plain") {
    // 📜 Extract text from TXT
    return file.buffer.toString("utf-8");
  }

  if (
    fileType === "application/vnd.ms-excel" ||
    fileType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  ) {
    // 📊 Extract text from Excel (.xls, .xlsx)
    const workbook = xlsx.read(file.buffer, { type: "buffer" });
    let text = "";
    workbook.SheetNames.forEach((sheetName) => {
      const sheet = workbook.Sheets[sheetName];
      text += xlsx.utils.sheet_to_csv(sheet) + "\n";
    });
    return text;
  }
  throw new Error("Unsupported file type");
}
// **Upload Document Endpoint**
const uploaddocument = async (req, res) => {
  try {
    const {title , description,userId} = req.body;
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // 📌 Extract text based on file type
    const docText = await extractText(req.file);
    // Generate Embedding Using GoogleGenerativeAIEmbeddings
    const [embeddingVector] = await embeddingModel.embedDocuments([docText]);

    // Save Document with Embedding
    const docId = await saveDocument(docText, embeddingVector, userId,title,description);

    chatbotType = "Document Chatbot";
    const newSession = await prisma.chatbotSession.create({
      data: {
        userId,
        chatbotType,
        title,
        description,
      },
    });
    await prisma.document.update({
      where: { id: docId },
      data: { sessionID: newSession.id },
    });
    
    res.json({ message: "Document uploaded and processed", documentId: docId ,title:title,description:description,sessionId:newSession.id});
  } catch (error) {
    console.error("Error Uploading Document:", error);
    res.status(500).json({ error: "Error processing document" });
  }
};

async function searchDocuments(queryEmbedding, k = 4, documentId = null) {
  let query;
  let values;

  if (documentId) {
    // 🔹 Search within a specific document
    query = `
      SELECT id, content
      FROM "Document"
      WHERE id = $3
      ORDER BY embedding <=> $1::vector
      LIMIT $2
    `;
    values = [queryEmbedding, k, documentId];
  } else {
    // 🔹 Search across all documents (default behavior)
    query = `
      SELECT id, content
      FROM "Document"
      ORDER BY embedding <=> $1::vector
      LIMIT $2
    `;
    values = [queryEmbedding, k];
  }

  try {
    const results = await prisma.$queryRaw(query, ...values);
    return results;
  } catch (error) {
    console.error("Error Searching Documents:", error);
    throw new Error("Failed to retrieve similar documents.");
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

// **Query Endpoint: Retrieves Documents & Calls Gemini API**
const query = async (req, res) => {
  try {
    console.log("Query Request:", req.body);
    const { question, documentId } = req.body;
    if (!question) {
      return res.status(400).json({ error: "Question is required" });
    }

    let contextText = "";

    if (documentId) {
      // **Directly Fetch Content from Provided Document ID**
      const doc = await prisma.document.findUnique({
        where: { id: documentId },
        select: { content: true },
      });

      if (!doc) {
        return res.status(404).json({ error: "Document not found" });
      }

      contextText = doc.content;
    } else {
      // **Retrieve Top Relevant Documents Using Similarity Search**
      const [queryEmbedding] = await embeddingModel.embedDocuments([question]);
      const docs = await searchDocuments(queryEmbedding, 4, documentId);

      // Combine Retrieved Document Content into Context for Gemini
      contextText = docs.map((doc) => doc.content).join("\n---\n");
    }

    // **Build Prompt for Gemini**
    const prompt = `Context:\n${contextText}\n\nQuestion: ${question}\nAnswer (based solely on the context):`;

    // **Call Gemini API to Generate an Answer**
    const answer = await callGeminiAPI(prompt);
    console.log(answer);  
    res.json({
      answer,
      contextSource: documentId ? `Document ID: ${documentId}` : "Top retrieved documents",
    });
  } catch (error) {
    console.error("Error Processing Query:", error);
    res.status(500).json({ error: "Error processing query" });
  }
};
  

const getallDocuments = async (req, res) => {
  try {
    const userId = req.body;
    const documents = await prisma.document.findMany({
      where: { userId: userId },
      select: { id: true, content: true },
    });
    res.json(documents);
  } catch (error) {
    console.error("Error Retrieving Documents:", error);
    res.status(500).json({ error: "Error retrieving documents" });
  }
};


// **Export Endpoints**
module.exports = { uploaddocument, query };
