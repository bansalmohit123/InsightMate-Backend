const { YoutubeTranscript } = require("youtube-transcript");

const prisma = require("../config/db");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const { GoogleGenerativeAIEmbeddings } = require("@langchain/google-genai");
require("dotenv").config();
const embeddingModel = new GoogleGenerativeAIEmbeddings({
  model: "models/embedding-001",
  apiKey: process.env.GEMINI_API_KEY,
});
const vectorToBytes = (vector) => Buffer.from(new Float32Array(vector).buffer);

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function extractYouTubeTranscript(videoUrl) {
  try {
    console.log(`Fetching transcript for YouTube Video: ${videoUrl}`);

    // Extract video ID from URL
    const videoId = videoUrl.split("v=")[1]?.split("&")[0];

    if (!videoId) throw new Error("Invalid YouTube URL");

    // Fetch transcript
    const transcriptResponse = await YoutubeTranscript.fetchTranscript(videoId);

    // Extract and join transcript text
    const transcriptText = transcriptResponse
      .map((item) => item.text)
      .join(" ");

    return transcriptText || "No transcript found.";
  } catch (error) {
    console.error("Error Fetching YouTube Transcript:", error);
    throw new Error("Failed to extract content from the YouTube video.");
  }
}

// **Function to Save YouTube Video Transcript in Database**
async function saveYouTubeVideo(videoUrl, userId,title,description) {
  // 🔹 Extract transcript from YouTube
  const transcript = await extractYouTubeTranscript(videoUrl);

  // 🔹 Generate embedding for the transcript
  const [embeddingVector] = await embeddingModel.embedDocuments([transcript]);

  // 🔹 Store in Prisma Database
  const savedVideo = await prisma.youTubeVideo.create({
    data: {
      url: videoUrl,
      transcript,
      embedding: vectorToBytes(embeddingVector),
      title: title, 
      description: description,
      User: {
        connect: { id: userId },
      },
    },
  });

  return savedVideo;
}

const uploadYouTubeVideo = async (req, res) => {
  try {
    const { videoUrl ,title,description,userId} = req.body;
    console.log(req.body);
    if (!videoUrl) {
      return res.status(400).json({ error: "YouTube video URL is required" });
    }
    // 🔹 Save the extracted transcript
    const savedVideo = await saveYouTubeVideo(videoUrl, userId,title,description);
    chatbotType = "YouTube Chatbot";
    const newSession = await prisma.chatbotSession.create({
      data: {
        userId,
        chatbotType,
        title,
        description,
      },
    });

    await prisma.youTubeVideo.update({
      where: { id: savedVideo.id },
      data: { sessionID: newSession.id },
    });
    res.json({
      message: "YouTube transcript extracted and stored successfully",
      id: savedVideo.id,
      title:title,
      description:description,
      youtubeurl: videoUrl,
      sessionID:newSession.id
    });
  } catch (error) {
    console.error("Error Processing YouTube Video:", error);
    res.status(500).json({ error: "Error processing YouTube video" });
  }
};

const bytesToVector = (bytes) => Array.from(new Float32Array(bytes));

async function searchYouTubeContent(queryEmbedding, k = 3, videoId = null) {
    let values, query;
   if(videoId){
     query = `
    SELECT id, url, transcript
    FROM "YouTubeVideo"
    WHERE id = $3
    ORDER BY embedding <=> $1::vector
    LIMIT $2
    `;
    values = [queryEmbedding, k, videoId];
   }else{
   query = `
    SELECT id, url, transcript
    FROM "YouTubeVideo"
    ORDER BY embedding <=> $1::vector
    LIMIT $2
  `;
    values = [queryEmbedding, k];
   }

  try {
    const results = await prisma.$queryRaw(query, ...values);
    return results;
  } catch (error) {
    console.error("Error Searching YouTube Content:", error);
    throw new Error("Failed to retrieve similar video content.");
  }
}
async function callGeminiAPI(prompt) {
  try {
    // await delay(1000); // Wait 1 second before calling
    console.log("Sending request to Gemini API...");

    // Select the Gemini model (use "gemini-pro" for text-based queries)
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Send the prompt to Gemini
    console.log("Prompt:", prompt);
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      safetySettings: [
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_ONLY_HIGH" },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_ONLY_HIGH" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_ONLY_HIGH" },
      ],
    });
    
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

const queryYouTube = async (req, res) => {
  try {
    const { question, videoId } = req.body;
    if (!question) {
      return res.status(400).json({ error: "Question is required" });
    }

    let contextText = "";

    if (videoId) {
      // 🔹 Fetch stored transcript by video ID
      const video = await prisma.youTubeVideo.findUnique({
        where: { id: videoId },
        select: { transcript: true },
      });

      if (!video) {
        return res.status(404).json({ error: "Video content not found" });
      }

      contextText = video.transcript;
    } else {
      // 🔹 Convert the user query into an embedding
      const [queryEmbedding] = await embeddingModel.embedDocuments([question]);

      // 🔹 Retrieve the most relevant video transcripts
      const videos = await searchYouTubeContent(queryEmbedding, 3,videoId);

      // 🔹 Combine retrieved transcripts into context
      contextText = videos.map((video) => video.transcript).join("\n---\n");
    }

    // 🔹 Build prompt for Gemini
    const prompt = `Context:\n${contextText}\n\nQuestion: ${question}\nAnswer (based solely on the context):`;

    // 🔹 Generate answer from Gemini API
    const answer = await callGeminiAPI(prompt);

    console.log(answer);
    res.json({
      answer,
      contextSource: videoId
        ? `YouTube Video ID: ${videoId}`
        : "Top retrieved videos",
    });
  } catch (error) {
    console.error("Error Processing Query:", error);
    res.status(500).json({ error: "Error processing YouTube query" });
  }
};

module.exports = {
  queryYouTube,
  uploadYouTubeVideo,
};
