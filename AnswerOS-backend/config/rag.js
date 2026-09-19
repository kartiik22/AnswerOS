/**
 * RAG helpers — 3 tools we reuse:
 * 1) Hugging Face  → turn text into numbers (embeddings)
 * 2) Pinecone      → store / search those numbers
 * 3) Groq          → answer questions with an LLM
 *
 * Tip: Pinecone index size must match the model.
 *      all-MiniLM-L6-v2 needs dimension = 384
 */

// Step A: text → vector (embedding)
async function getEmbeddings() {
  const { HuggingFaceInferenceEmbeddings } = await import(
    "@langchain/community/embeddings/hf"
  );
  return new HuggingFaceInferenceEmbeddings({
    apiKey: process.env.HUGGINGFACE_API_KEY,
    model: process.env.HF_EMBEDDING_MODEL || "sentence-transformers/all-MiniLM-L6-v2",
  });
}

// Step B: connect to Pinecone (our "memory" of documents)
async function getVectorStore() {
  const { Pinecone } = await import("@pinecone-database/pinecone");
  const { PineconeStore } = await import("@langchain/pinecone");

  const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
  const index = pinecone.Index(process.env.PINECONE_INDEX);

  // LangChain wraps Pinecone + embeddings together
  return PineconeStore.fromExistingIndex(await getEmbeddings(), {
    pineconeIndex: index,
  });
}

// Step C: Groq chat model (LangChain 1.0)
async function getChatModel() {
  const { ChatGroq } = await import("@langchain/groq");
  return new ChatGroq({
    model: "openai/gpt-oss-120b",
    temperature: 0, // 0 = more factual / less creative
  });
}

module.exports = { getVectorStore, getChatModel };
