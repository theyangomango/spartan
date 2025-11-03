import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../firebase.config';

let submitReportFn = null;

const getAppVersion = () => {
  try {
    const expoVersion = Constants?.expoConfig?.version || Constants?.manifest?.version;
    return expoVersion || 'unknown';
  } catch {
    return 'unknown';
  }
};

export default async function reportContent(payload = {}) {
  try {
    if (!submitReportFn) {
      submitReportFn = httpsCallable(functions, 'submitModerationReport');
    }

    const clientInfo = {
      platform: Platform.OS,
      appVersion: getAppVersion(),
      buildNumber:
        Constants?.expoConfig?.ios?.buildNumber ||
        Constants?.manifest?.ios?.buildNumber ||
        Constants?.expoConfig?.android?.versionCode ||
        '',
      deviceName: Constants?.deviceName || '',
      locale: Constants?.expoConfig?.extra?.locale || undefined,
    };

    const reporterUid = String(global?.userData?.uid || '').trim();
    const response = await submitReportFn({ ...payload, clientInfo, reporterUid });
    return response?.data || { ok: true };
  } catch (error) {
    console.warn('reportContent failed', error?.message || error);
    return { ok: false, error };
  }
}
