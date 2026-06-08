export type AnatomyLayer = 'NORMAL' | 'MUSCLE' | 'SKELETON' | 'VASCULAR' | 'ORGAN';

export interface AnatomyMarker {
  id: string;
  name: string;
  bodyPart: 'HEAD' | 'CHEST' | 'BACK' | 'KNEE';
  position: { x: number; y: number; z: number }; // 3D coordinates in Three.js space
  onset: string;
  status: string;
  medications: string[];
  doctorName: string;
  complaintLevel: number;
  lastCheckup: string;
  notes: string;
}
