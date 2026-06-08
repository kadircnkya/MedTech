import { Request, Response } from 'express';
import multer from 'multer';
import { GridFsStorage } from 'multer-gridfs-storage';
import mongoose from 'mongoose';
import { MedicalDocumentModel } from '../models/MedicalDocumentModel';
import crypto from 'crypto';
import path from 'path';

// Storage configuration
const storage = new GridFsStorage({
  url: process.env.MONGO_URI || 'mongodb://localhost:27017/patient_db',
  file: (req: any, file: any) => {
    return new Promise((resolve, reject) => {
      crypto.randomBytes(16, (err, buf) => {
        if (err) {
          return reject(err);
        }
        const filename = buf.toString('hex') + path.extname(file.originalname);
        const fileInfo = {
          filename: filename,
          bucketName: 'medical_documents' // Matches GridFS bucket
        };
        resolve(fileInfo);
      });
    });
  }
});

export const upload = multer({ storage });

export class MedicalDocumentController {
  
  /** Upload a document */
  async uploadDocument(req: any, res: Response) {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, error: 'No file uploaded' });
      }

      const { title, documentType, notes } = req.body;
      const userId = req.user.userId;

      const newDoc = await MedicalDocumentModel.create({
        userId,
        title,
        documentType,
        fileId: req.file.id,
        fileName: req.file.filename,
        contentType: req.file.contentType,
        sizeBytes: req.file.size,
        uploadedBy: userId,
        notes
      });

      return res.status(201).json({ success: true, data: newDoc });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /** Get all documents for user */
  async getUserDocuments(req: any, res: Response) {
    try {
      const documents = await MedicalDocumentModel.find({ userId: req.user.userId }).sort({ createdAt: -1 });
      return res.json({ success: true, data: documents });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /** Download document from GridFS */
  async downloadDocument(req: any, res: Response) {
    try {
      const doc = await MedicalDocumentModel.findById(req.params.id);
      if (!doc) {
        return res.status(404).json({ success: false, error: 'Document not found' });
      }

      // Check auth
      if (doc.userId !== req.user.userId && req.user.role !== 'doctor' && req.user.role !== 'admin') {
        return res.status(403).json({ success: false, error: 'Unauthorized' });
      }

      const db = mongoose.connection.db;
      if (!db) {
        return res.status(500).json({ success: false, error: 'Database connection not established' });
      }
      const bucket = new mongoose.mongo.GridFSBucket(db, {
        bucketName: 'medical_documents'
      });

      const downloadStream = bucket.openDownloadStream(doc.fileId);
      
      res.set('Content-Type', doc.contentType);
      res.set('Content-Disposition', `attachment; filename="${doc.fileName}"`);
      
      downloadStream.pipe(res);
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }
}
