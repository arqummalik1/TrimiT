import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'trimit_last_handled_notification_id';

export async function getLastHandledNotificationId(): Promise<string | null> {
  return AsyncStorage.getItem(KEY);
}

export async function setLastHandledNotificationId(id: string): Promise<void> {
  await AsyncStorage.setItem(KEY, id);
}
