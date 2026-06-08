import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QdrantClient } from '@qdrant/js-client-rest';
import axios from 'axios';

@Injectable()
export class RagService {
  private readonly logger = new Logger(RagService.name);
  private qdrantClient: QdrantClient;

  constructor(private readonly configService: ConfigService) {
    this.qdrantClient = new QdrantClient({
      url: this.configService.get<string>('QDRANT_URL') || 'http://qdrant:6333',
    });
  }

  // 1. Generate text embedding using HF Model
  async getEmbedding(text: string): Promise<number[]> {
    const hfToken = this.configService.get<string>('HUGGINGFACE_API_KEY');
    try {
      const response = await axios.post(
        'https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/all-MiniLM-L6-v2',
        { inputs: text },
        { headers: { Authorization: `Bearer ${hfToken}` } },
      );
      return response.data;
    } catch (error) {
      this.logger.error('Failed to retrieve embeddings from HuggingFace:', error.message);
      throw new Error('Embedding generation failed.');
    }
  }

  // 2. Index structured clinical metadata into Qdrant Vector DB
  async upsertClinicalEmbedding(userId: string, id: string, text: string, metadata: any) {
    const vector = await this.getEmbedding(text);
    try {
      await this.qdrantClient.upsert('health_record_vectors', {
        wait: true,
        points: [
          {
            id,
            vector,
            payload: { userId, text, ...metadata },
          },
        ],
      });
      this.logger.log(`Successfully upserted vector embedding for record: ${id}`);
    } catch (error) {
      this.logger.error('Qdrant vector upsert failed:', error.message);
    }
  }

  // 3. Main RAG Pipeline Execution Flow
  async answerClinicalQuestion(userId: string, question: string): Promise<string> {
    const hfToken = this.configService.get<string>('HUGGINGFACE_API_KEY');
    
    // Step A: Convert question to vector
    const questionVector = await this.getEmbedding(question);

    // Step B: Search Qdrant for semantic similarity matching userId
    let searchResults = [];
    try {
      searchResults = await this.qdrantClient.search('health_record_vectors', {
        vector: questionVector,
        filter: {
          must: [
            { key: 'userId', match: { value: userId } },
          ],
        },
        limit: 3,
      });
    } catch (error) {
      this.logger.error('Qdrant semantic search failed:', error.message);
    }

    // Step C: Retrieve matching contexts
    const contexts = searchResults
      .map((res: any) => `- [${res.payload.type}] ${res.payload.text}`)
      .join('\n');

    if (!contexts) {
      return 'Kayıtlarınızda bu konuyla ilgili eşleşen bir sağlık bilgisi bulunamadı. Genel bir sağlık sorunuz varsa yanıtlayabilirim.';
    }

    // Step D: Construct prompt and query LLM via HuggingFace
    const prompt = `
Aşağıda kullanıcının tıbbi kayıtlarından derlenmiş kişisel bilgiler yer almaktadır:
${contexts}

Kullanıcı Sorusu: "${question}"

Kurallar:
1. Kesinlikle kendi başınıza yeni bir tıbbi teşhis koymayın.
2. Yalnızca yukarıdaki bağlam (context) verilerini temel alarak kurumsal, açıklayıcı ve güvenilir bir dille cevap verin.
3. Yanıtı anlaşılır bir Türkçe ile yazın.

Tıbbi Değerlendirme ve Cevap:
`;

    try {
      const response = await axios.post(
        'https://api-inference.huggingface.co/models/meta-llama/Meta-Llama-3-8B-Instruct',
        {
          inputs: prompt,
          parameters: { max_new_tokens: 450, temperature: 0.25 },
        },
        { headers: { Authorization: `Bearer ${hfToken}` } },
      );
      return response.data[0].generated_text.replace(prompt, '').trim();
    } catch (error) {
      this.logger.error('HuggingFace text-generation API failed:', error.message);
      return 'AI asistanı şu anda yanıt üretemiyor. Lütfen daha sonra tekrar deneyiniz.';
    }
  }
}
