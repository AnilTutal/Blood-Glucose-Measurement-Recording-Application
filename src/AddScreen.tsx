import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, Modal } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { olcumKaydet, Olcum } from './storage';

const DURUM_SECENEKLERI: Olcum['durum'][] = ['Aç', 'Tok', 'Herhangi'];

function bugunTarih(): string {
  return new Date().toLocaleDateString('tr-TR');
}

function bugunTarihISO(): string {
  return new Date().toISOString().split('T')[0];
}

function isoTarihiTR(iso: string): string {
  const [yil, ay, gun] = iso.split('-');
  return `${gun}.${ay}.${yil}`;
}

export default function AddScreen({ navigation }: any) {
  const simdi = new Date();
  const [deger, setDeger] = useState('');
  const [tarih, setTarih] = useState(bugunTarih());
  const [secilenISO, setSecilenISO] = useState(bugunTarihISO());
  const [saat, setSaat] = useState(
    simdi.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
  );
  const [durum, setDurum] = useState<Olcum['durum']>('Aç');
  const [not, setNot] = useState('');
  const [takvimAcik, setTakvimAcik] = useState(false);

  async function kaydet() {
    if (!deger || isNaN(Number(deger))) {
      Alert.alert('Hata', 'Lütfen geçerli bir şeker değeri girin.');
      return;
    }
    const yeniOlcum: Olcum = {
      id: Date.now().toString(),
      deger: Number(deger),
      tarih, saat, durum, not,
    };
    const basarili = await olcumKaydet(yeniOlcum);
    if (basarili) {
      Alert.alert('Kaydedildi!', 'Ölçümünüz kaydedildi.', [
        { text: 'Tamam', onPress: () => navigation.goBack() }
      ]);
    } else {
      Alert.alert('Hata', 'Kayıt sırasında bir hata oluştu.');
    }
  }

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.baslik}>Yeni Ölçüm Ekle</Text>

      <Text style={styles.etiket}>Tarih</Text>
      <TouchableOpacity style={styles.tarihButon} onPress={() => setTakvimAcik(true)}>
        <Text style={styles.tarihIkon}>📅</Text>
        <Text style={styles.tarihYazi}>{tarih}</Text>
      </TouchableOpacity>

      <Modal visible={takvimAcik} transparent animationType="fade">
        <View style={styles.modalArka}>
          <View style={styles.modalKutu}>
            <Text style={styles.modalBaslik}>Tarih Seç</Text>
            <Calendar
              current={secilenISO}
              onDayPress={(day: any) => {
                setSecilenISO(day.dateString);
                setTarih(isoTarihiTR(day.dateString));
                setTakvimAcik(false);
              }}
              markedDates={{ [secilenISO]: { selected: true, selectedColor: '#4A90D9' } }}
              theme={{ todayTextColor: '#4A90D9', selectedDayBackgroundColor: '#4A90D9', arrowColor: '#4A90D9' }}
            />
            <TouchableOpacity style={styles.modalKapat} onPress={() => setTakvimAcik(false)}>
              <Text style={styles.modalKapatYazi}>İptal</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Text style={styles.etiket}>Saat</Text>
      <TextInput style={styles.input} placeholder="SS:DD" value={saat} onChangeText={setSaat} />

      <Text style={styles.etiket}>Şeker Değeri (mg/dL)</Text>
      <TextInput style={styles.input} placeholder="Örn: 110" keyboardType="numeric" value={deger} onChangeText={setDeger} />

      <Text style={styles.etiket}>Ölçüm Durumu</Text>
      <View style={styles.durumKutu}>
        {DURUM_SECENEKLERI.map((d) => (
          <TouchableOpacity
            key={d}
            style={[styles.durumButon, durum === d && styles.durumSecili]}
            onPress={() => setDurum(d)}
          >
            <Text style={[styles.durumYazi, durum === d && styles.durumYaziSecili]}>{d}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.etiket}>Not (opsiyonel)</Text>
      <TextInput style={[styles.input, { height: 80 }]} placeholder="Eklemek istediğiniz not..." multiline value={not} onChangeText={setNot} />

      <TouchableOpacity style={styles.kaydetButon} onPress={kaydet}>
        <Text style={styles.kaydetYazi}>Kaydet</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 20 },
  baslik: { fontSize: 22, fontWeight: 'bold', color: '#333', marginBottom: 20, marginTop: 10 },
  etiket: { fontSize: 14, color: '#666', marginBottom: 6, marginTop: 14 },
  input: { backgroundColor: '#fff', borderRadius: 10, padding: 12, fontSize: 16, borderWidth: 1, borderColor: '#ddd' },
  tarihButon: { backgroundColor: '#fff', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#ddd', flexDirection: 'row', alignItems: 'center', gap: 8 },
  tarihIkon: { fontSize: 18 },
  tarihYazi: { fontSize: 16, color: '#333' },
  durumKutu: { flexDirection: 'row', gap: 10, marginTop: 4 },
  durumButon: { flex: 1, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#ddd', backgroundColor: '#fff', alignItems: 'center' },
  durumSecili: { backgroundColor: '#4A90D9', borderColor: '#4A90D9' },
  durumYazi: { color: '#333', fontWeight: '600' },
  durumYaziSecili: { color: '#fff' },
  kaydetButon: { backgroundColor: '#4A90D9', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 30, marginBottom: 40 },
  kaydetYazi: { color: '#fff', fontSize: 17, fontWeight: 'bold' },
  modalArka: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalKutu: { backgroundColor: '#fff', borderRadius: 16, padding: 16, width: '90%', elevation: 8 },
  modalBaslik: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 10, textAlign: 'center' },
  modalKapat: { marginTop: 12, padding: 12, backgroundColor: '#f0f0f0', borderRadius: 10, alignItems: 'center' },
  modalKapatYazi: { color: '#666', fontWeight: '600' },
});