const prisma = require("../config/db");



const getoption = async (req, res) => {
    try {
        const { option, userId } = req.body;
        console.log(req.body);

        if (option == 'Document Chatbot') {
            const documents = await prisma.document.findMany({
                where: { userId: userId },
                select: { title: true, description: true,id:true },
            });
            res.json(documents);
        } else if (option == 'Webpage Extraction Chatbot') {
            const documents = await prisma.uRLDocument.findMany({
                where: { userId: userId },
                select: { title: true, description: true,id:true },
            });
            res.json(documents);
        } else {
            const documents = await prisma.youTubeVideo.findMany({
                where: { userId: userId },
                select: { title: true, description: true,id:true },
            });
            res.json(documents);
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'An error occurred while fetching data' });
    }

}

module.exports = { getoption };