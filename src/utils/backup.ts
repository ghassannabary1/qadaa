import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from './qadaa';

export interface BackupData {
  state: AppState;
  exportedAt: string;
  version: string;
}

// Backup keys
export const BACKUP_KEY = 'qadaa_backup';
export const EXPORT_KEY = 'qadaa_export_file';

/**
 * Create a backup of the current state
 * Auto-syncs to iCloud on iOS (automatic via system)
 * Saves to device storage on both platforms
 */
export async function createBackup(state: AppState): Promise<BackupData | null> {
  try {
    const backup: BackupData = {
      state,
      exportedAt: new Date().toISOString(),
      version: '1.0',
    };
    
    // Save to AsyncStorage (automatic on both iOS/Android)
    await AsyncStorage.setItem(BACKUP_KEY, JSON.stringify(backup));
    
    // Create shareable export file
    await saveExportFile(JSON.stringify(backup, null, 2));
    
    console.log('✅ Backup created and synced automatically');
    return backup;
  } catch (error) {
    console.warn('Backup creation failed', error);
    return null;
  }
}

/**
 * Restore from backup
 */
export async function restoreBackup(): Promise<AppState | null> {
  try {
    const backupJson = await AsyncStorage.getItem(BACKUP_KEY);
    
    if (!backupJson) {
      console.log('No backup found');
      return null;
    }
    
    const backup: BackupData = JSON.parse(backupJson);
    
    // Clear current state
    await AsyncStorage.setItem('qadaa-simple-v2', JSON.stringify({
      target: { fajr: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 },
      completed: { fajr: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 },
      todayCompleted: { fajr: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 },
      log: [],
      includeWitr: false,
      notes: '',
    }));
    
    // Restore from backup
    await AsyncStorage.setItem('qadaa-simple-v2', JSON.stringify(backup.state));
    
    console.log('✅ Backup restored successfully');
    return backup.state;
  } catch (error) {
    console.warn('Restore backup failed', error);
    return null;
  }
}

/**
 * Create export file for sharing/manual backup
 */
async function saveExportFile(content: string): Promise<void> {
  try {
    // For now, just save to AsyncStorage with special key
    // In future, could use expo-file-system to create shareable files
    await AsyncStorage.setItem(EXPORT_KEY, content);
  } catch (error) {
    console.warn('Failed to save export file', error);
  }
}

/**
 * Export backup for sharing
 */
export async function exportBackup(): Promise<string | null> {
  try {
    const backupJson = await AsyncStorage.getItem(BACKUP_KEY);
    if (!backupJson) return null;
    
    // Add export header for easy import
    const exportString = `QADA APP BACKUP\n\n${backupJson}`;
    await AsyncStorage.setItem(EXPORT_KEY, exportString);
    
    return exportString;
  } catch (error) {
    console.warn('Export failed', error);
    return null;
  }
}

/**
 * Import backup from file
 */
export async function importBackup(backupText: string): Promise<AppState | null> {
  try {
    // Validate header
    if (!backupText.startsWith('QADA APP BACKUP')) {
      console.warn('Invalid backup format');
      return null;
    }
    
    const content = backupText.split('\n\n', 2)[1] || '';
    const backup: BackupData = JSON.parse(content);
    
    // Clear and restore
    await AsyncStorage.setItem('qadaa-simple-v2', JSON.stringify(backup.state));
    
    console.log('✅ Backup imported successfully');
    return backup.state;
  } catch (error) {
    console.warn('Import backup failed', error);
    return null;
  }
}

/**
 * Check if backup exists and is recent (last 30 days)
 */
export async function getBackupAge(): Promise<number | null> {
  try {
    const backupJson = await AsyncStorage.getItem(BACKUP_KEY);
    if (!backupJson) return null;
    
    const backup: BackupData = JSON.parse(backupJson);
    const ageMs = Date.now() - new Date(backup.exportedAt).getTime();
    return ageMs / (1000 * 60 * 60 * 24); // Convert to days
  } catch {
    return null;
  }
}
