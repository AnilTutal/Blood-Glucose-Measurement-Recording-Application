import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Olcum {
  id: string;
  deger: number;
  tarih: string;
  saat: string;
  durum: 'Aç' | 'Tok' | 'Herhangi';
  not: string;
}

const ANAHTAR = 'seker_olcumleri';

export async function olcumleriGetir(): Promise<Olcum[]> {
  try {
    const json = await AsyncStorage.getItem(ANAHTAR);
    return json ? JSON.parse(json) : [];
  } catch {
    return [];
  }
}

export async function olcumKaydet(yeniOlcum: Olcum): Promise<boolean> {
  try {
    const mevcutlar = await olcumleriGetir();
    const guncellendi = [yeniOlcum, ...mevcutlar];
    await AsyncStorage.setItem(ANAHTAR, JSON.stringify(guncellendi));
    return true;
  } catch {
    return false;
  }
}

export async function olcumSil(id: string): Promise<boolean> {
  try {
    const mevcutlar = await olcumleriGetir();
    const filtrelendi = mevcutlar.filter((o) => o.id !== id);
    await AsyncStorage.setItem(ANAHTAR, JSON.stringify(filtrelendi));
    return true;
  } catch {
    return false;
  }
}