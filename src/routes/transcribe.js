const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 1. Configure Multer DiskStorage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 } // Limit audio files to 10MB
});

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function transcribeWithHF(filePath) {
    const fileBuffer = fs.readFileSync(filePath);
    
    // Call HuggingFace Whisper API natively via fetch
    const response = await fetch("https://router.huggingface.co/hf-inference/models/openai/whisper-large-v3-turbo", {
        method: "POST",
        headers: {
            "Authorization": "Bearer " + process.env.HF_TOKEN,
            "Content-Type": "audio/wav"
        },
        body: fileBuffer
    });

    if (!response.ok) {
        throw new Error(`HF API HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    if (data.error) {
        throw new Error(`HF API Error: ${data.error}`);
    }
    return data;
}

router.post('/', upload.single('audio'), async (req, res) => {
    try {
        const audioFile = req.file;
        if (!audioFile) return res.status(400).json({ error: 'No audio file provided' });

        // 1. Send immediate response to Flutter
        res.status(200).json({ message: 'Processing in background' });

        // 2. Upload to Supabase Storage
        const fileBuffer = fs.readFileSync(audioFile.path);
        const { data, error: storageError } = await supabase.storage
            .from('driver-audio')
            .upload(`reports/${audioFile.filename}`, fileBuffer, { contentType: 'audio/m4a' });

        if (storageError) throw storageError;

        // 3. SAFE TRANSCRIPTION STEP (Whisper via Native Fetch)
        let finalText = "Transcription failed";

        try {
            console.log("🤖 Transcribing with Whisper (Native Fetch API)...");
            const transcription = await transcribeWithHF(audioFile.path);

            if (transcription && transcription.text) {
                finalText = transcription.text;
                console.log("📝 AI Success:", finalText);
            }
        } catch (aiError) {
            console.error("⚠️ Whisper API Error:", aiError.message);
            finalText = "AI transcription failed";
        }

        // 4. LOG TO DATABASE (UPDATE collection_tasks instead of INSERT)
        const taskId = req.body.task_id;
        
        if (!taskId) {
            console.warn("⚠️ No task_id provided. Skipping database update, but audio uploaded successfully.");
        } else {
            // Get public URL for the uploaded audio
            const { data: publicUrlData } = supabase.storage
                .from('driver-audio')
                .getPublicUrl(`reports/${audioFile.filename}`);

            const { error: dbError } = await supabase
                .from('collection_tasks')
                .update({ 
                    voice_note_url: publicUrlData.publicUrl, 
                    voice_transcript: finalText,
                    status: 'not_collected' // Mark issue state directly
                })
                .eq('id', taskId);

            if (dbError) {
                console.error("❌ Database Update Error:", dbError.message);
            } else {
                console.log(`✅ Collection task ${taskId} successfully updated with voice report.`);
            }
        }
        
        // 5. Cleanup local tmp file
        fs.unlinkSync(audioFile.path);

    } catch (error) {
        console.error('❌ Background Error:', error.message);
    }
});

// Admin Route to see reports
router.get('/', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('driver_voice_reports')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
