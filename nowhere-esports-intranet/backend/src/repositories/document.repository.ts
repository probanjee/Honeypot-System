import { supabaseAdmin } from '../config/supabase';
import { DatabaseError } from '../errors';
import { logger } from '../utils/logger';

export class DocumentRepository {
  async findFolderById(id: string): Promise<any> {
    const { data, error } = await supabaseAdmin
      .from('folders')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      logger.error({ err: error, id }, 'DocumentRepository.findFolderById failed');
      throw new DatabaseError(error.message);
    }
    return data;
  }

  async createFolder(input: any): Promise<any> {
    const { data, error } = await supabaseAdmin
      .from('folders')
      .insert(input)
      .select()
      .single();

    if (error) {
      logger.error({ err: error, input }, 'DocumentRepository.createFolder failed');
      throw new DatabaseError(error.message);
    }
    return data;
  }

  async findDocumentById(id: string): Promise<any> {
    const { data, error } = await supabaseAdmin
      .from('documents')
      .select('*, document_versions(*)')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      logger.error({ err: error, id }, 'DocumentRepository.findDocumentById failed');
      throw new DatabaseError(error.message);
    }
    return data;
  }

  async createDocument(docInput: any, fileUrl: string, uploadedBy: string): Promise<any> {
    // 1. Create the document metadata
    const { data: doc, error: docErr } = await supabaseAdmin
      .from('documents')
      .insert(docInput)
      .select()
      .single();

    if (docErr || !doc) {
      logger.error({ err: docErr, docInput }, 'DocumentRepository.createDocument (metadata) failed');
      throw new DatabaseError(docErr?.message ?? 'Failed to insert document');
    }

    // 2. Create the first version
    const { error: verErr } = await supabaseAdmin
      .from('document_versions')
      .insert({
        document_id: doc.id,
        version: 1,
        file_url: fileUrl,
        uploaded_by: uploadedBy,
        size_bytes: docInput.size_bytes ?? 0,
        change_summary: 'Initial upload',
      });

    if (verErr) {
      logger.error({ err: verErr, docId: doc.id }, 'DocumentRepository.createDocument (version) failed');
      throw new DatabaseError(verErr.message);
    }

    return doc;
  }
}

export const documentRepository = new DocumentRepository();
