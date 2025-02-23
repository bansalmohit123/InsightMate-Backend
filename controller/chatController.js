const prisma = require("../config/db");


const saveMessage = async (req, res) => {
    try {
      const { sessionId, sender, message } = req.body;
  
      const chatMessage = await prisma.chatMessage.create({
        data: {
          sessionId,
          sender,
          message,
        },
      });
  
      res.json({ success: true, message: "Message saved", chatMessage });
    } catch (error) {
      console.error("Error saving message:", error);
      res.status(500).json({ error: "Failed to save message" });
    }
  };
  

  const getMessages = async (req, res) => {
    try {
      const { sessionId } = req.params;
  
      const messages = await prisma.chatMessage.findMany({
        where: { sessionId },
        orderBy: { timestamp: "asc" }, // Oldest messages first
      });
  
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  };

  
  module.exports = {
    saveMessage,
    getMessages,
  };