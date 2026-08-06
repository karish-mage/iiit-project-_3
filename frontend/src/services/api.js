import axios from 'axios';

const API_BASE = 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 120000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Health ────────────────────────────────────────────────
export const getHealth = () => api.get('/health');

// ── Stats (Home Page) ────────────────────────────────────
export const getStats = () => api.get('/stats');

// ── Documents ────────────────────────────────────────────
export const uploadDocuments = (files) => {
  const formData = new FormData();
  files.forEach((file) => formData.append('files', file));
  return api.post('/upload-documents', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const processDocuments = () => api.post('/process-documents');
export const getDocuments = () => api.get('/documents');
export const deleteDocument = (docId) => api.delete(`/documents/${docId}`);
export const reindexDocument = (docId) => api.put(`/documents/${docId}/reindex`);

// ── Customer Data ────────────────────────────────────────
export const uploadCustomerData = (file) => {
  const formData = new FormData();
  formData.append('file', file);
  return api.post('/upload-customer-data', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

// ── Query ────────────────────────────────────────────────
export const askQuestion = (query, sessionId = 'default', useLlmJudge = false) =>
  api.post('/ask', { query, session_id: sessionId, use_llm_judge: useLlmJudge });

// ── Streaming Chat ───────────────────────────────────────
export const chatStream = async (query, sessionId, onChunk, onDone) => {
  try {
    const response = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, session_id: sessionId, stream: true }),
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.done) {
              onDone(data.metadata || {});
            } else {
              onChunk(data.text);
            }
          } catch (e) {
            // Ignore malformed SSE lines
          }
        }
      }
    }
  } catch (error) {
    console.error('Stream error:', error);
    throw error;
  }
};

// ── Compare Strategies ───────────────────────────────────
export const compareStrategies = (query) =>
  api.post('/compare-strategies', { query });

// ── Evaluate ─────────────────────────────────────────────
export const runEvaluation = () => api.post('/evaluate');

// ── Analytics ────────────────────────────────────────────
export const getAnalytics = () => api.get('/analytics');

// ── Evaluation Results ───────────────────────────────────
export const getEvaluationResults = () => api.get('/evaluation-results');

// ── Hybrid Search ────────────────────────────────────────
export const hybridSearch = (query, domains = null, topK = 10, filters = null) =>
  api.post('/search', { query, domains, top_k: topK, filters });

// ── Metadata ─────────────────────────────────────────────
export const getCollectionMetadata = (collection, limit = 100) =>
  api.get(`/metadata/${collection}?limit=${limit}`);

export default api;
