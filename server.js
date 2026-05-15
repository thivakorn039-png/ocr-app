const express = require('express');
const cors = require('cors');
const vision = require('@google-cloud/vision');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static('public')); // ดึงหน้าเว็บจากโฟลเดอร์ public มาแสดง

app.post('/api/ocr', async (req, res) => {
    try {
        const { imageBase64 } = req.body;
        if (!imageBase64) return res.status(400).json({ error: 'ไม่มีรูปภาพส่งมา' });

        const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");

        // ดึงค่า API Key จาก Environment Variables ของ Render
        const client = new vision.ImageAnnotatorClient({
            credentials: {
                client_email: process.env.GOOGLE_CLIENT_EMAIL,
                // แปลง \n ใน string ให้กลายเป็นการขึ้นบรรทัดใหม่จริงๆ
                private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
            },
            projectId: process.env.GOOGLE_PROJECT_ID,
        });

        const [result] = await client.textDetection({
            image: { content: base64Data }
        });

        const text = result.fullTextAnnotation ? result.fullTextAnnotation.text : '';

        // --- ส่วนสกัดข้อมูล (ดึงเฉพาะส่วนที่ต้องการ) ---
        const idMatch = text.match(/\b\d\s\d{4}\s\d{5}\s\d{2}\s\d\b/);
        const idNumber = idMatch ? idMatch[0].replace(/\s/g, '') : 'ไม่พบข้อมูล';

        const nameMatch = text.match(/(นาย|นาง|นางสาว)\s+([ก-๙]+)\s+([ก-๙]+)/);
        const name = nameMatch ? nameMatch[0] : 'ไม่พบข้อมูล';

        const dobMatch = text.match(/เกิดวันที่\s*(\d{1,2}\s*[ก-๙]+\.?\s*\d{4})/);
        const dob = dobMatch ? dobMatch[1] : 'ไม่พบข้อมูล';

        const religionMatch = text.match(/ศาสนา\s*([ก-๙]+)/);
        const religion = religionMatch ? religionMatch[1] : 'ไม่พบข้อมูล';

        const addressMatch = text.match(/(?:ที่อยู่|ที่อยู่)\s*([\s\S]*?)(?=\s*(?:วันออกบัตร|Date of Issue|6 ส\.ค\.|[0-9]{1,2}\s*[ก-๙]+\.?\s*[0-9]{4}))/);
        const address = addressMatch ? addressMatch[1].replace(/\n/g, ' ').trim() : 'ไม่พบข้อมูล';

        res.status(200).json({
            data: { id: idNumber, name: name, dob: dob, religion: religion, address: address }
        });

    } catch (error) {
        console.error("OCR Error:", error);
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});