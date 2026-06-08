import { Request, Response } from 'express';
import { MedicalRecordModel } from '../models/MedicalRecordModel';

export class MedicalRecordController {
  
  /** Create a new record */
  async createRecord(req: any, res: Response) {
    try {
      const { recordType, title, description, diagnosisDate, status } = req.body;
      const userId = req.user.userId;

      const record = await MedicalRecordModel.create({
        userId,
        recordType,
        title,
        description,
        diagnosisDate,
        status,
        versions: [{ content: description, updatedBy: userId }]
      });

      return res.status(201).json({ success: true, data: record });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /** Get all records for a user, optionally filtered by type */
  async getRecords(req: any, res: Response) {
    try {
      const { recordType } = req.query;
      const query: any = { userId: req.user.userId };
      if (recordType) query.recordType = recordType;

      const records = await MedicalRecordModel.find(query).sort({ createdAt: -1 });
      return res.json({ success: true, data: records });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /** Update a record (adds a version) */
  async updateRecord(req: any, res: Response) {
    try {
      const { description, status } = req.body;
      const record = await MedicalRecordModel.findById(req.params.id);

      if (!record) {
        return res.status(404).json({ success: false, error: 'Record not found' });
      }

      // Check auth
      if (record.userId !== req.user.userId && req.user.role !== 'doctor' && req.user.role !== 'admin') {
        return res.status(403).json({ success: false, error: 'Unauthorized' });
      }

      // If description changed, append a new version
      if (description && description !== record.description) {
        record.versions.push({
          content: record.description, // push old content to history
          updatedAt: new Date(),
          updatedBy: req.user.userId
        });
        record.description = description;
      }

      if (status) record.status = status;

      await record.save();

      return res.json({ success: true, data: record });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /** Delete a record */
  async deleteRecord(req: any, res: Response) {
    try {
      const record = await MedicalRecordModel.findOneAndDelete({ _id: req.params.id, userId: req.user.userId });
      if (!record) return res.status(404).json({ success: false, error: 'Record not found' });
      return res.json({ success: true, message: 'Record deleted' });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }
}
