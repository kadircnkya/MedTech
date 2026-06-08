// =============================================================
// domain/entities/Patient.ts — Hasta Domain Entity
// =============================================================
// Saf domain modeli — hiçbir framework bağımlılığı yok.
// Hasta kaydı için gerekli tüm alanları tanımlar.
// =============================================================

/**
 * IPatient — Hasta kayıt arayüzü
 *
 * @property id          - MongoDB ObjectId (string)
 * @property patientName - Hasta adı soyadı
 * @property age         - Hasta yaşı
 * @property gender      - Cinsiyet (erkek, kadın, diğer)
 * @property diagnosis   - Tanı (teşhis)
 * @property department  - İlgili departman/bölüm
 * @property doctor      - Sorumlu doktor adı
 * @property notes       - Ek notlar
 * @property status      - Hasta durumu
 * @property date        - Kayıt/muayene tarihi
 * @property createdBy   - Kaydı oluşturan kullanıcı ID'si (JWT'den)
 * @property createdAt   - Oluşturulma tarihi
 * @property updatedAt   - Son güncelleme tarihi
 */
export interface IPatient {
  id?: string;
  patientName: string;
  age: number;
  gender: 'erkek' | 'kadın' | 'diğer';
  diagnosis: string;
  department?: string;
  doctor?: string;
  notes?: string;
  status: 'aktif' | 'tedavi_altında' | 'taburcu' | 'takipte';
  date: Date;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Patient Domain Class
 * Domain Business Logic burada tutulur (factory, validasyon vb.)
 */
export class Patient {
  constructor(
    public readonly patientName: string,
    public readonly age: number,
    public readonly gender: 'erkek' | 'kadın' | 'diğer',
    public readonly diagnosis: string,
    public readonly status: 'aktif' | 'tedavi_altında' | 'taburcu' | 'takipte' = 'aktif',
    public readonly date: Date = new Date(),
    public readonly department?: string,
    public readonly doctor?: string,
    public readonly notes?: string,
    public readonly createdBy?: string,
    public readonly id?: string,
    public readonly createdAt: Date = new Date(),
    public readonly updatedAt: Date = new Date()
  ) {}

  /**
   * Factory method — yeni hasta kaydı oluşturur
   */
  static create(
    patientName: string,
    age: number,
    gender: 'erkek' | 'kadın' | 'diğer',
    diagnosis: string,
    department?: string,
    doctor?: string,
    notes?: string,
    createdBy?: string
  ): Patient {
    return new Patient(
      patientName,
      age,
      gender,
      diagnosis,
      'aktif',
      new Date(),
      department,
      doctor,
      notes,
      createdBy
    );
  }

  /**
   * Yaş geçerliliğini kontrol eder
   */
  isValidAge(): boolean {
    return this.age > 0 && this.age <= 150;
  }
}
