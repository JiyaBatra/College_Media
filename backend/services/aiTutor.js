const pdfParse = require('pdf-parse');
const OpenAI = require('openai');
const { v4: uuidv4 } = require('uuid');
const DocumentChunk = require('../models/DocumentChunk');
const logger = require('../utils/logger');

// OpenAI Configuration
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || 'sk-placeholder'
});

// Configuration
const CHUNK_SIZE = 1000; // Characters per chunk
const CHUNK_OVERLAP = 200;
const TOP_K_RESULTS = 5;

class AITutor {
    /**
     * Process and index a PDF document
     * @param {Buffer} pdfBuffer - PDF file buffer
     * @param {string} fileName - Original filename
     * @param {string} userId - User who uploaded
     */
    static async indexDocument(pdfBuffer, fileName, userId) {
        try {
            // 1. Parse PDF to text
            const pdfData = await pdfParse(pdfBuffer);
            const text = pdfData.text;
            const totalPages = pdfData.numpages;

            logger.info(`Parsed PDF: ${fileName} (${totalPages} pages, ${text.length} chars)`);

            // 2. Split into chunks
            const chunks = this.splitIntoChunks(text);
            const documentId = uuidv4();

            // 3. Generate embeddings and store
            const savedChunks = [];
            for (let i = 0; i < chunks.length; i++) {
                const embedding = await this.generateEmbedding(chunks[i]);

                const chunk = await DocumentChunk.create({
                    documentId,
                    userId,
                    fileName,
                    chunkIndex: i,
                    content: chunks[i],
                    embedding,
                    metadata: {
                        totalPages,
                        charCount: chunks[i].length
                    }
                });
                savedChunks.push(chunk._id);
            }

            logger.info(`Indexed ${chunks.length} chunks for document ${documentId}`);

            return {
                documentId,
                fileName,
                totalChunks: chunks.length,
                totalPages
            };
        } catch (error) {
            logger.error('Document indexing failed:', error);
            throw error;
        }
    }

    /**
     * Split text into overlapping chunks
     */
    static splitIntoChunks(text) {
        const chunks = [];
        let start = 0;

        while (start < text.length) {
            const end = Math.min(start + CHUNK_SIZE, text.length);
            chunks.push(text.slice(start, end));
            start += CHUNK_SIZE - CHUNK_OVERLAP;
        }

        return chunks;
    }

    /**
     * Generate embedding using OpenAI
     */
    static async generateEmbedding(text) {
        try {
            const response = await openai.embeddings.create({
                model: 'text-embedding-ada-002',
                input: text.replace(/\n/g, ' ')
            });
            return response.data[0].embedding;
        } catch (error) {
            logger.error('Embedding generation failed:', error);
            // Return mock embedding for development
            return new Array(1536).fill(0).map(() => Math.random() * 0.1);
        }
    }

    /**
     * Semantic search for relevant chunks
     * Uses cosine similarity (simplified - in production use MongoDB Atlas Vector Search)
     */
    static async searchRelevantChunks(query, userId, documentId = null) {
        try {
            const queryEmbedding = await this.generateEmbedding(query);

            // Build match criteria
            const match = { userId };
            if (documentId) match.documentId = documentId;

            // Fetch all user's chunks (in production, use Atlas Vector Search)
            const chunks = await DocumentChunk.find(match).lean();

            // Calculate cosine similarity
            const scored = chunks.map(chunk => ({
                ...chunk,
                score: this.cosineSimilarity(queryEmbedding, chunk.embedding)
            }));

            // Sort by score and take top K
            scored.sort((a, b) => b.score - a.score);
            return scored.slice(0, TOP_K_RESULTS);
        } catch (error) {
            logger.error('Semantic search failed:', error);
            return [];
        }
    }

    /**
     * Cosine similarity between two vectors
     */
    static cosineSimilarity(a, b) {
        let dotProduct = 0;
        let normA = 0;
        let normB = 0;
        for (let i = 0; i < a.length; i++) {
            dotProduct += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }
        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }

    /**
     * Answer question using RAG
     * @param {string} question - User's question
     * @param {string} userId - User ID
     * @param {string} documentId - Optional specific document
     * @param {object} res - Express response for streaming
     */
    static async answerQuestion(question, userId, documentId = null, res = null) {
        try {
            // 1. Retrieve relevant context
            const relevantChunks = await this.searchRelevantChunks(question, userId, documentId);

            if (relevantChunks.length === 0) {
                return { answer: "I couldn't find any relevant information in your documents. Please upload course materials first." };
            }

            // 2. Build context from chunks
            const context = relevantChunks.map(c => c.content).join('\n\n---\n\n');
            const sources = relevantChunks.map(c => ({
                fileName: c.fileName,
                chunkIndex: c.chunkIndex,
                score: c.score.toFixed(3)
            }));

            // 3. Generate answer using GPT
            const systemPrompt = `You are an AI study assistant for college students. Answer questions based ONLY on the provided context. If the answer is not in the context, say "I don't have enough information to answer that based on your documents."

Context from uploaded documents:
${context}`;

            if (res) {
                // Streaming response
                res.setHeader('Content-Type', 'text/event-stream');
                res.setHeader('Cache-Control', 'no-cache');
                res.setHeader('Connection', 'keep-alive');

                const stream = await openai.chat.completions.create({
                    model: 'gpt-4-turbo-preview',
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: question }
                    ],
                    stream: true
                });

                for await (const chunk of stream) {
                    const content = chunk.choices[0]?.delta?.content || '';
                    if (content) {
                        res.write(`data: ${JSON.stringify({ content })}\n\n`);
                    }
                }
                res.write(`data: ${JSON.stringify({ done: true, sources })}\n\n`);
                res.end();
                return;
            }

            // Non-streaming response
            const completion = await openai.chat.completions.create({
                model: 'gpt-4-turbo-preview',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: question }
                ]
            });

            return {
                answer: completion.choices[0].message.content,
                sources
            };
        } catch (error) {
            logger.error('RAG answer generation failed:', error);
            return { answer: 'Sorry, I encountered an error while processing your question.', error: error.message };
        }
    }

    /**
     * Get user's indexed documents
     */
    static async getUserDocuments(userId) {
        const docs = await DocumentChunk.aggregate([
            { $match: { userId } },
            {
                $group: {
                    _id: '$documentId',
                    fileName: { $first: '$fileName' },
                    totalChunks: { $sum: 1 },
                    createdAt: { $first: '$createdAt' }
                }
            },
            { $sort: { createdAt: -1 } }
        ]);
        return docs;
    }

    /**
     * Delete a document and all its chunks
     */
    static async deleteDocument(documentId, userId) {
        const result = await DocumentChunk.deleteMany({ documentId, userId });
        return result.deletedCount;
    }
}

module.exports = AITutor;
