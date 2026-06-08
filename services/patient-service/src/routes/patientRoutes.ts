import { Router } from 'express';
import { PatientController } from '../controllers/PatientController';
import { MedicalRecordController } from '../controllers/MedicalRecordController';
import { MedicalDocumentController, upload } from '../controllers/MedicalDocumentController';
import { authMiddleware, authorizeRoles } from '../middleware/authMiddleware';

export function createPatientRoutes(controller: PatientController): Router {
  const router = Router();
  const recordController = new MedicalRecordController();
  const docController = new MedicalDocumentController();

  // =============================================
  // MEDICAL RECORDS (Allergies, Diseases, etc)
  // =============================================
  router.post('/records', authMiddleware, recordController.createRecord.bind(recordController));
  router.get('/records', authMiddleware, recordController.getRecords.bind(recordController));
  router.put('/records/:id', authMiddleware, recordController.updateRecord.bind(recordController));
  router.delete('/records/:id', authMiddleware, recordController.deleteRecord.bind(recordController));

  // =============================================
  // MEDICAL DOCUMENTS (GridFS: PDF, MR, Labs)
  // =============================================
  router.post('/documents', authMiddleware, upload.single('file'), docController.uploadDocument.bind(docController));
  router.get('/documents', authMiddleware, docController.getUserDocuments.bind(docController));
  router.get('/documents/:id/download', authMiddleware, docController.downloadDocument.bind(docController));

  // =============================================
  // LEGACY PATIENT ROUTES
  // =============================================
  router.post('/', authMiddleware, controller.create.bind(controller));
  router.get('/', authMiddleware, controller.getAll.bind(controller));
  router.get('/stats', authMiddleware, controller.getStats.bind(controller));
  router.get('/:id', authMiddleware, controller.getById.bind(controller));
  router.put('/:id', authMiddleware, controller.update.bind(controller));
  router.delete('/:id', authMiddleware, authorizeRoles('admin', 'doctor'), controller.delete.bind(controller));

  return router;
}
