import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { olcumleriGetir, olcumSil, Olcum } from './storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as XLSX from 'xlsx';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';



function renkBelirle(deger: number, durum: string): string {
  if (durum === 'Aç') {
    if (deger < 70) return '#e74c3c';
    if (deger <= 100) return '#2ecc71';
    if (deger <= 125) return '#f39c12';
    return '#e74c3c';
  }
  if (deger < 140) return '#2ecc71';
  if (deger <= 199) return '#f39c12';
  return '#e74c3c';
}

function durumEtiketi(durum: string): string {
  if (durum === 'Aç') return 'Aç';
  if (durum === 'Tok') return 'Tok';
  return 'Herhangi';
}

function ayAdiGetir(ay: number): string {
  const aylar = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran',
                  'Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
  return aylar[ay];
}

function trTarihSirala(tarih: string): number {
  const [gun, ay, yil] = tarih.split('.');
  return new Date(`${yil}-${ay}-${gun}`).getTime();
}

type GunGrubu = { tarih: string; olcumler: Olcum[] };
type AyGrubu = { baslik: string; ayAnahtar: string; gunler: GunGrubu[] };

function verileriGrupla(olcumler: Olcum[]): AyGrubu[] {
  const ayMap: Record<string, Record<string, Olcum[]>> = {};
  olcumler.forEach((o) => {
    const [, ay, yil] = o.tarih.split('.');
    const ayAnahtar = `${yil}-${ay}`;
    if (!ayMap[ayAnahtar]) ayMap[ayAnahtar] = {};
    if (!ayMap[ayAnahtar][o.tarih]) ayMap[ayAnahtar][o.tarih] = [];
    ayMap[ayAnahtar][o.tarih].push(o);
  });
  return Object.keys(ayMap)
    .sort((a, b) => a.localeCompare(b))
    .map((ayAnahtar) => {
      const [yil, ay] = ayAnahtar.split('-');
      const baslik = `${ayAdiGetir(parseInt(ay) - 1)} ${yil}`;
      const gunler = Object.keys(ayMap[ayAnahtar])
        .sort((a, b) => trTarihSirala(b) - trTarihSirala(a))
        .map((tarih) => ({
          tarih,
          olcumler: ayMap[ayAnahtar][tarih].sort((a, b) => b.saat.localeCompare(a.saat)),
        }));
      return { baslik, ayAnahtar, gunler };
    });
}

function enIyiAyIndex(gruplar: AyGrubu[]): number {
  if (gruplar.length === 0) return 0;
  const bugun = new Date();
  const bugunAy = `${bugun.getFullYear()}-${String(bugun.getMonth() + 1).padStart(2, '0')}`;
  const bugunIndex = gruplar.findIndex(g => g.ayAnahtar === bugunAy);
  return bugunIndex >= 0 ? bugunIndex : gruplar.length - 1;
}

export default function HomeScreen({ navigation }: any) {
  const [olcumler, setOlcumler] = useState<Olcum[]>([]);
  const [aktifAyIndex, setAktifAyIndex] = useState(0);
  const [secimModu, setSecimModu] = useState(false);
  const [secilenler, setSecilenler] = useState<Set<string>>(new Set());

  useFocusEffect(
    useCallback(() => {
      olcumleriGetir().then((data) => {
        const gruplar = verileriGrupla(data);
        setOlcumler(data);
        setAktifAyIndex(enIyiAyIndex(gruplar));
      });
      setSecimModu(false);
      setSecilenler(new Set());
    }, [])
  );

  const ayGruplari = verileriGrupla(olcumler);
  const aktifAy = ayGruplari[aktifAyIndex];

  function veriGuncelle(data: Olcum[]) {
    const gruplar = verileriGrupla(data);
    setOlcumler(data);
    if (gruplar.length === 0) {
      setAktifAyIndex(0);
    } else {
      // mevcut ay hala var mı?
      const mevcutAy = ayGruplari[aktifAyIndex]?.ayAnahtar;
      const yeniIndex = gruplar.findIndex(g => g.ayAnahtar === mevcutAy);
      setAktifAyIndex(yeniIndex >= 0 ? yeniIndex : enIyiAyIndex(gruplar));
    }
  }

  function tekSil(id: string, deger: number) {
    Alert.alert('Kaydı Sil', `${deger} mg/dL ölçümünü silmek istiyor musunuz?`, [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Sil', style: 'destructive',
        onPress: async () => {
          await olcumSil(id);
          olcumleriGetir().then(veriGuncelle);
        }
      }
    ]);
  }

  async function excelIndir() {
  try {
    const tumOlcumler = await olcumleriGetir();
    
    

    const satirlar = tumOlcumler
  .sort((a, b) => {
    const [ag, aa, ay] = a.tarih.split('.');
    const [bg, ba, by] = b.tarih.split('.');
    const tarihA = new Date(`${ay}-${aa}-${ag}`).getTime();
    const tarihB = new Date(`${by}-${ba}-${bg}`).getTime();
    if (tarihA !== tarihB) return tarihA - tarihB;
    return a.saat.localeCompare(b.saat);
  })
  .map(o => ({
    Tarih: o.tarih,
    Saat: o.saat,
    'Şeker (mg/dL)': o.deger,
    Durum: o.durum,
    Not: o.not || '',
  }));

    const ws = XLSX.utils.json_to_sheet(satirlar);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Şeker Ölçümleri');

    const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
    const uri = (FileSystem as any).documentDirectory + 'seker_olcumleri.xlsx';
    
    await (FileSystem as any).writeAsStringAsync(uri, wbout, {
  encoding: 'base64',
});

    await Sharing.shareAsync(uri, {
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      dialogTitle: 'Şeker Ölçümlerini İndir',
    });
  } catch (e) {
    Alert.alert('Hata', 'Excel oluşturulurken bir hata oluştu.');
  }
}

  async function secilenleriSil() {
    Alert.alert('Toplu Sil', `${secilenler.size} kaydı silmek istiyor musunuz?`, [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Sil', style: 'destructive',
        onPress: async () => {
          for (const id of secilenler) {
            await olcumSil(id);
          }
          setSecimModu(false);
          setSecilenler(new Set());
          olcumleriGetir().then(veriGuncelle);
        }
      }
    ]);
  }

  function secimToggle(id: string) {
    setSecilenler(prev => {
      const yeni = new Set(prev);
      yeni.has(id) ? yeni.delete(id) : yeni.add(id);
      return yeni;
    });
  }

  function secimModuCik() {
    setSecimModu(false);
    setSecilenler(new Set());
  }

  function OlcumSatiri({ item }: { item: Olcum }) {
    const renk = renkBelirle(item.deger, item.durum);
    const secili = secilenler.has(item.id);
    return (
      <TouchableOpacity
        onLongPress={() => { setSecimModu(true); secimToggle(item.id); }}
        onPress={() => secimModu && secimToggle(item.id)}
        activeOpacity={secimModu ? 0.6 : 1}
      >
        <View style={[styles.olcumSatir, secili && styles.olcumSatirSecili]}>
          {secimModu && (
            <View style={[styles.checkBox, secili && styles.checkBoxSecili]}>
              {secili && <Text style={styles.checkTik}>✓</Text>}
            </View>
          )}
          <View style={[styles.renkBant, { backgroundColor: renk }]} />
          <View style={styles.olcumIcerik}>
            <Text style={[styles.olcumDeger, { color: renk }]}>
              {item.deger} <Text style={styles.birim}>mg/dL</Text>
            </Text>
            <View style={styles.olcumAlt}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
  <Ionicons name="time-outline" size={13} color="#888" />
  <Text style={styles.olcumSaat}>{item.saat}</Text>
</View>
              <View style={[styles.durumPil, { borderColor: renk }]}>
                <Text style={[styles.durumPilYazi, { color: renk }]}>{durumEtiketi(item.durum)}</Text>
              </View>
            </View>
            {item.not ? (
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
    <Ionicons name="document-text-outline" size={12} color="#aaa" />
    <Text style={styles.olcumNot}>{item.not}</Text>
  </View>
) : null}
          </View>
          {!secimModu && (
            <TouchableOpacity onPress={() => tekSil(item.id, item.deger)} style={styles.silButon}>
  <Ionicons name="trash-outline" size={20} color="#e74c3c" />
</TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  }

  function GunKarti({ gun }: { gun: GunGrubu }) {
    return (
      <View style={styles.gunKart}>
        <View style={styles.gunBaslikSatir}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
  <Ionicons name="calendar-outline" size={14} color="#555" />
  <Text style={styles.gunBaslik}>{gun.tarih}</Text>
</View>
          <Text style={styles.gunSayac}>{gun.olcumler.length} ölçüm</Text>
        </View>
        {gun.olcumler.map((o) => <OlcumSatiri key={o.id} item={o} />)}
      </View>
    );
  }

  return (
    <View style={styles.container}>

      {/* Başlık */}
      {secimModu ? (
        <View style={styles.secimBaslik}>
          <TouchableOpacity onPress={secimModuCik}>
            <Text style={styles.iptalYazi}>İptal</Text>
          </TouchableOpacity>
          <Text style={styles.secimSayac}>{secilenler.size} seçildi</Text>
          <TouchableOpacity onPress={secilenleriSil} disabled={secilenler.size === 0}>
            <Text style={[styles.silYaziBaslik, secilenler.size === 0 && { color: '#ccc' }]}>Sil</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.baslikSatir}>
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
  <MaterialCommunityIcons name="water" size={28} color="#e74c3c" />
  <Text style={styles.baslik}>Şeker Takibi</Text>
</View>
  <TouchableOpacity onPress={excelIndir} style={styles.excelButon}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
  <MaterialCommunityIcons name="microsoft-excel" size={16} color="#fff" />
  <Text style={styles.excelButonYazi}>Excel</Text>
</View>
  </TouchableOpacity>
</View>
      )}

      {/* Ay Navigasyonu */}
      {ayGruplari.length > 0 && (
        <View style={styles.ayNav}>
          <TouchableOpacity
            onPress={() => setAktifAyIndex(i => Math.max(i - 1, 0))}
            disabled={aktifAyIndex === 0}
            style={[styles.ayButon, aktifAyIndex === 0 && styles.ayButonDevre]}
          >
            <Ionicons name="chevron-back" size={22} color="#fff" />

          </TouchableOpacity>
          <Text style={styles.ayBaslik}>{aktifAy?.baslik}</Text>
          <TouchableOpacity
            onPress={() => setAktifAyIndex(i => Math.min(i + 1, ayGruplari.length - 1))}
            disabled={aktifAyIndex >= ayGruplari.length - 1}
            style={[styles.ayButon, aktifAyIndex >= ayGruplari.length - 1 && styles.ayButonDevre]}
          >
            <Ionicons name="chevron-forward" size={22} color="#fff" />

          </TouchableOpacity>
        </View>
      )}

      {/* Liste */}
      {olcumler.length === 0 ? (
        <View style={styles.bosEkran}>
          <Text style={styles.bosYazi}>Henüz ölçüm yok</Text>
          <Text style={styles.bosAlt}>Sağ alttaki + butonuna bas</Text>
        </View>
      ) : aktifAy ? (
        <FlatList
          data={aktifAy.gunler}
          keyExtractor={(item) => item.tarih}
          renderItem={({ item }) => <GunKarti gun={item} />}
          contentContainerStyle={{ paddingBottom: 100 }}
        />
      ) : null}

      {/* Ekle Butonu */}
      {!secimModu && (
        <TouchableOpacity style={styles.ekleButon} onPress={() => navigation.navigate('Ekle')}>
          <Ionicons name="add" size={32} color="#fff" />

        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8', padding: 16, paddingTop: 52 },
  baslik: { fontSize: 24, fontWeight: 'bold', color: '#333', marginBottom: 12, marginTop: 10 },

  secimBaslik: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 12, marginTop: 10,
  },
  iptalYazi: { fontSize: 16, color: '#4A90D9', fontWeight: '600' },
  secimSayac: { fontSize: 17, fontWeight: 'bold', color: '#333' },
  silYaziBaslik: { fontSize: 16, color: '#e74c3c', fontWeight: '600' },

  ayNav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', borderRadius: 12, padding: 10, marginBottom: 14,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  ayButon: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#4A90D9', justifyContent: 'center', alignItems: 'center' },
  ayButonDevre: { backgroundColor: '#ccc' },
  ayBaslik: { fontSize: 17, fontWeight: 'bold', color: '#333' },

  gunKart: {
    backgroundColor: '#fff', borderRadius: 14, marginBottom: 14,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, elevation: 3, overflow: 'hidden',
  },
  gunBaslikSatir: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 10, backgroundColor: '#f8f9fa',
    borderBottomWidth: 1, borderBottomColor: '#eee',
  },
  gunBaslik: { fontSize: 14, fontWeight: 'bold', color: '#555' },
  gunSayac: { fontSize: 12, color: '#999' },

  olcumSatir: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  olcumSatirSecili: { backgroundColor: '#eef4ff' },
  checkBox: {
    width: 22, height: 22, borderRadius: 11, borderWidth: 2,
    borderColor: '#ccc', marginLeft: 10, justifyContent: 'center', alignItems: 'center',
  },
  checkBoxSecili: { backgroundColor: '#4A90D9', borderColor: '#4A90D9' },
  checkTik: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
  renkBant: { width: 5, alignSelf: 'stretch' },
  olcumIcerik: { flex: 1, padding: 12 },
  olcumDeger: { fontSize: 20, fontWeight: 'bold' },
  birim: { fontSize: 12, color: '#999', fontWeight: 'normal' },
  olcumAlt: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  olcumSaat: { fontSize: 13, color: '#888' },
  durumPil: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 },
  durumPilYazi: { fontSize: 11, fontWeight: '600' },
  olcumNot: { fontSize: 12, color: '#aaa', marginTop: 4 },
  silButon: { padding: 14 },

  bosEkran: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  bosYazi: { fontSize: 18, color: '#aaa', fontWeight: 'bold' },
  bosAlt: { fontSize: 14, color: '#bbb', marginTop: 8 },

  ekleButon: {
    position: 'absolute', bottom: 80, right: 24,
    backgroundColor: '#4A90D9', width: 60, height: 60,
    borderRadius: 30, justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8, elevation: 6,
  },
  baslikSatir: {
  flexDirection: 'row', justifyContent: 'space-between',
  alignItems: 'center', marginBottom: 12, marginTop: 10,
},
excelButon: {
  backgroundColor: '#27ae60', paddingHorizontal: 12,
  paddingVertical: 6, borderRadius: 8,
},
excelButonYazi: { color: '#fff', fontWeight: '600', fontSize: 13 },
});