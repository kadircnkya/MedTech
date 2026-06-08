import mongoose from 'mongoose';
import { MedicationModel } from './domain/entities/Medication';
import { TURKISH_MEDICATIONS_SEED } from './data/turkishMedicationsDatabase';

async function seed() {
  try {
    console.log('MongoDB Atlas\'a bağlanılıyor...');
    await mongoose.connect('mongodb+srv://Kadircnkya:A.kadir2838@medtech-db.goyjlv1.mongodb.net/medication_db?retryWrites=true&w=majority&appName=medtech-db');
    
    console.log('Bağlantı başarılı. Eski ilaç verileri temizleniyor...');
    await MedicationModel.deleteMany({});
    
    console.log(`${TURKISH_MEDICATIONS_SEED.length} adet Türkiye ilaç verisi Atlas'a yükleniyor...`);
    await MedicationModel.insertMany(TURKISH_MEDICATIONS_SEED);
    
    console.log('✅ İşlem tamam! İlaç veritabanı başarıyla dolduruldu.');
    process.exit(0);
  } catch (err) {
    console.error('Hata:', err);
    process.exit(1);
  }
}

seed();
