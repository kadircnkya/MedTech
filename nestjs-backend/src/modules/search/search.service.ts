import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ElasticsearchService } from '@nestjs/elasticsearch';

@Injectable()
export class SearchService implements OnModuleInit {
  private readonly logger = new Logger(SearchService.name);

  constructor(private readonly elasticsearchService: ElasticsearchService) {}

  async onModuleInit() {
    await this.initializeIndices();
  }

  private async initializeIndices() {
    try {
      const indexName = 'patient-health-records';
      const exists = await this.elasticsearchService.indices.exists({ index: indexName });
      
      if (!exists) {
        await this.elasticsearchService.indices.create({
          index: indexName,
          body: {
            settings: {
              analysis: {
                analyzer: {
                  turkish_analyzer: {
                    type: 'custom',
                    tokenizer: 'standard',
                    filter: ['lowercase', 'apostrophe', 'turkish_lowercase'],
                  },
                },
              },
            },
            mappings: {
              properties: {
                userId: { type: 'keyword' },
                recordId: { type: 'keyword' },
                title: { type: 'text', analyzer: 'turkish_analyzer' },
                content: { type: 'text', analyzer: 'turkish_analyzer' },
                category: { type: 'keyword' },
                createdAt: { type: 'date' },
              },
            },
          },
        });
        this.logger.log(`Elasticsearch index '${indexName}' successfully created.`);
      }
    } catch (error) {
      this.logger.error('Failed to initialize Elasticsearch index:', error.message);
    }
  }

  // Index a new medical document, lab result, or chronic condition
  async indexHealthRecord(
    userId: string,
    recordId: string,
    title: string,
    content: string,
    category: string,
  ) {
    try {
      await this.elasticsearchService.index({
        index: 'patient-health-records',
        id: recordId,
        body: {
          userId,
          recordId,
          title,
          content,
          category,
          createdAt: new Date(),
        },
      });
      this.logger.log(`Indexed health record: ${recordId} under category ${category}`);
    } catch (error) {
      this.logger.error(`Failed to index health record ${recordId}:`, error.message);
    }
  }

  // Perform full-text search across historical documents
  async searchRecords(userId: string, searchTerm: string): Promise<any[]> {
    try {
      const result = await this.elasticsearchService.search({
        index: 'patient-health-records',
        body: {
          query: {
            bool: {
              must: [
                { term: { userId } },
                {
                  multi_match: {
                    query: searchTerm,
                    fields: ['title^3', 'content'],
                    fuzziness: 'AUTO',
                  },
                },
              ],
            },
          },
        },
      });

      return result.hits.hits.map(hit => hit._source);
    } catch (error) {
      this.logger.error(`Search query failed for user ${userId}:`, error.message);
      return [];
    }
  }
}
