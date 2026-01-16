import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { RagService } from './rag.service';
import {
  IndexDocumentDto,
  IndexProjectDocumentDto,
  SearchRequestDto,
  QueryRequestDto,
  SearchResponse,
  QueryResponse,
} from './dto/rag.dto';

@ApiTags('RAG')
@Controller('rag')
export class RagController {
  constructor(private readonly ragService: RagService) {}

  @Post('index')
  @ApiOperation({
    summary: 'Index document',
    description: 'Index a document for semantic search and retrieval'
  })
  @ApiResponse({ status: 201, description: 'Document indexed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 500, description: 'Indexing failed' })
  async indexDocument(@Body() dto: IndexDocumentDto) {
    try {
      const result = await this.ragService.indexDocument(
        dto.content,
        dto.source,
        dto.sourceType || 'document',
        dto.metadata || {},
        dto.collection || 'default',
      );
      return {
        success: true,
        message: 'Document indexed successfully',
        source: dto.source,
        collection: dto.collection,
        documentId: result.documentId,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('index-project-document')
  @ApiOperation({
    summary: 'Index project document',
    description: 'Index a project document with auto-chunking for RAG'
  })
  @ApiResponse({ status: 201, description: 'Project document indexed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 500, description: 'Indexing failed' })
  async indexProjectDocument(@Body() dto: IndexProjectDocumentDto) {
    try {
      const result = await this.ragService.indexProjectDocument(
        dto.documentId,
        dto.projectId,
        dto.filename,
        dto.content,
        dto.fileType,
        dto.chunkSize,
        dto.chunkOverlap,
      );
      return {
        success: true,
        message: 'Project document indexed successfully',
        documentId: dto.documentId,
        chunksCreated: result.chunksCreated,
        collection: result.collection,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('search')
  @ApiOperation({
    summary: 'Search documents',
    description: 'Perform semantic search to find relevant documents'
  })
  @ApiResponse({ status: 201, description: 'Search completed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 500, description: 'Search failed' })
  async search(@Body() dto: SearchRequestDto): Promise<SearchResponse> {
    try {
      const results = await this.ragService.search(
        dto.query,
        dto.collection,
        dto.limit,
        dto.minScore,
        dto.sourceTypes,
      );
      return {
        success: true,
        results,
        query: dto.query,
        totalFound: results.length,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('query')
  @ApiOperation({
    summary: 'RAG query',
    description: 'Query knowledge base with retrieval-augmented generation to get AI-powered answers'
  })
  @ApiResponse({ status: 201, description: 'Query completed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 500, description: 'Query failed' })
  async query(@Body() dto: QueryRequestDto): Promise<QueryResponse> {
    try {
      const result = await this.ragService.query(
        dto.query,
        dto.collection,
        dto.contextLimit,
        dto.model,
        dto.systemPrompt,
      );
      return {
        success: true,
        answer: result.answer,
        sources: result.sources,
        model: result.model,
        tokensUsed: result.tokensUsed,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('collections')
  @ApiOperation({
    summary: 'List collections',
    description: 'Get list of all document collections in the knowledge base'
  })
  @ApiResponse({ status: 200, description: 'Collections retrieved successfully' })
  @ApiResponse({ status: 500, description: 'Failed to retrieve collections' })
  async listCollections() {
    try {
      const collections = await this.ragService.listCollections();
      return {
        success: true,
        collections,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete('collections/:collection')
  @ApiOperation({
    summary: 'Delete collection',
    description: 'Delete a document collection and all its indexed documents'
  })
  @ApiResponse({ status: 200, description: 'Collection deleted successfully' })
  @ApiResponse({ status: 404, description: 'Collection not found' })
  @ApiResponse({ status: 500, description: 'Deletion failed' })
  async deleteCollection(@Param('collection') collection: string) {
    try {
      await this.ragService.deleteCollection(collection);
      return {
        success: true,
        message: `Collection '${collection}' deleted`,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('stats')
  @ApiOperation({
    summary: 'Get knowledge base statistics',
    description: 'Get statistics about indexed documents, collections, and storage'
  })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  @ApiResponse({ status: 500, description: 'Failed to retrieve statistics' })
  async getStats() {
    try {
      const stats = await this.ragService.getStats();
      return {
        success: true,
        stats,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
