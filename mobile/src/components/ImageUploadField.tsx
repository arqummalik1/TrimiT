import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { useTheme, Theme } from '../theme/ThemeContext';
import { typography, spacing, borderRadius } from '../lib/utils';
import { getUserFacingMessage } from '../lib/userFacingError';
import { showToast } from '../store/toastStore';

export type ImageUploadFieldProps = {
  label?: string;
  value: string;
  onChange: (publicUrl: string) => void;
  onUpload: (localUri: string, onProgress: (pct: number) => void) => Promise<string>;
  aspect?: [number, number];
  disabled?: boolean;
  allowCamera?: boolean;
  testID?: string;
};

type UploadPhase = 'idle' | 'preparing' | 'uploading' | 'done' | 'error';

export function ImageUploadField({
  label = 'Photo',
  value,
  onChange,
  onUpload,
  aspect = [16, 9],
  disabled = false,
  allowCamera = true,
  testID,
}: ImageUploadFieldProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [phase, setPhase] = useState<UploadPhase>('idle');
  const [progress, setProgress] = useState(0);
  const [lastLocalUri, setLastLocalUri] = useState<string | null>(null);

  const displayUri = localPreview || value || null;
  const isBusy = phase === 'preparing' || phase === 'uploading';

  useEffect(() => {
    if (value && phase === 'done') {
      setLocalPreview(null);
    }
  }, [value, phase]);

  const runUpload = useCallback(
    async (uri: string) => {
      setLastLocalUri(uri);
      setLocalPreview(uri);
      setPhase('preparing');
      setProgress(5);

      try {
        const manipulated = await ImageManipulator.manipulateAsync(
          uri,
          [{ resize: { width: 1280 } }],
          { compress: 0.82, format: ImageManipulator.SaveFormat.JPEG }
        );

        setPhase('uploading');
        setProgress(10);

        const publicUrl = await onUpload(manipulated.uri, (pct) => {
          setProgress(Math.max(10, Math.min(99, pct)));
        });

        onChange(publicUrl);
        setPhase('done');
        setProgress(100);
        showToast('Image uploaded', 'success');
      } catch (error) {
        setPhase('error');
        setProgress(0);
        showToast(getUserFacingMessage(error), 'error');
      }
    },
    [onChange, onUpload]
  );

  const pickFromGallery = async () => {
    const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!granted) {
      Alert.alert('Permission required', 'Please allow access to your photo library.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
      allowsEditing: true,
      aspect,
      exif: false,
    });
    if (!result.canceled && result.assets[0]) {
      await runUpload(result.assets[0].uri);
    }
  };

  const pickFromCamera = async () => {
    const { granted } = await ImagePicker.requestCameraPermissionsAsync();
    if (!granted) {
      Alert.alert('Permission required', 'Please allow camera access.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.85,
      allowsEditing: true,
      aspect,
      exif: false,
    });
    if (!result.canceled && result.assets[0]) {
      await runUpload(result.assets[0].uri);
    }
  };

  const openPicker = () => {
    if (disabled || isBusy) return;

    const options: { text: string; onPress?: () => void; style?: 'cancel' }[] = [
      { text: 'Choose from Gallery', onPress: () => void pickFromGallery() },
    ];
    if (allowCamera) {
      options.unshift({ text: 'Take Photo', onPress: () => void pickFromCamera() });
    }
    options.push({ text: 'Cancel', style: 'cancel' });

    Alert.alert(label, 'Choose an option', options);
  };

  const retryUpload = () => {
    if (lastLocalUri) {
      void runUpload(lastLocalUri);
    } else {
      openPicker();
    }
  };

  return (
    <View style={styles.wrap} testID={testID}>
      <Text style={styles.label}>{label}</Text>

      <View style={styles.row}>
        {displayUri ? (
          <View style={styles.previewWrap}>
            <Image source={{ uri: displayUri }} style={styles.preview} resizeMode="cover" />
            {isBusy && (
              <View style={styles.overlay}>
                <ActivityIndicator size="large" color="#fff" />
                <Text style={styles.overlayText}>
                  {phase === 'preparing' ? 'Preparing…' : `Uploading… ${progress}%`}
                </Text>
              </View>
            )}
            {phase === 'done' && value ? (
              <View style={styles.doneBadge}>
                <Ionicons name="checkmark-circle" size={22} color={theme.colors.success} />
              </View>
            ) : null}
            {!isBusy && value ? (
              <TouchableOpacity
                style={styles.removeBtn}
                onPress={() => {
                  onChange('');
                  setLocalPreview(null);
                  setPhase('idle');
                  setProgress(0);
                }}
                accessibilityLabel="Remove image"
              >
                <Ionicons name="close-circle" size={22} color={theme.colors.error} />
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}

        <TouchableOpacity
          style={[styles.pickerBtn, displayUri ? styles.pickerBtnCompact : null]}
          onPress={phase === 'error' ? retryUpload : openPicker}
          disabled={disabled || isBusy}
          activeOpacity={0.85}
        >
          {isBusy ? (
            <>
              <ActivityIndicator color={theme.colors.primary} />
              <Text style={styles.pickerHint}>
                {phase === 'preparing' ? 'Preparing image…' : `Uploading… ${progress}%`}
              </Text>
            </>
          ) : phase === 'error' ? (
            <>
              <Ionicons name="refresh" size={26} color={theme.colors.error} />
              <Text style={[styles.pickerHint, { color: theme.colors.error }]}>Retry upload</Text>
            </>
          ) : (
            <>
              <Ionicons name="camera" size={26} color={theme.colors.primary} />
              <Text style={styles.pickerHint}>{displayUri ? 'Change' : 'Add photo'}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    wrap: {
      marginBottom: spacing.lg,
    },
    label: {
      ...typography.bodySmallMedium,
      color: theme.colors.textSecondary,
      marginBottom: spacing.sm,
    },
    row: {
      flexDirection: 'row',
      gap: spacing.md,
      alignItems: 'flex-start',
    },
    previewWrap: {
      position: 'relative',
      width: 120,
      height: 120,
      borderRadius: borderRadius.md,
      overflow: 'hidden',
      backgroundColor: theme.colors.surfaceSecondary,
    },
    preview: {
      width: '100%',
      height: '100%',
    },
    overlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.55)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.sm,
      gap: spacing.xs,
    },
    overlayText: {
      ...typography.captionMedium,
      color: '#fff',
      textAlign: 'center',
    },
    doneBadge: {
      position: 'absolute',
      bottom: 6,
      right: 6,
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      padding: 2,
    },
    removeBtn: {
      position: 'absolute',
      top: -6,
      right: -6,
      backgroundColor: theme.colors.surface,
      borderRadius: 11,
    },
    pickerBtn: {
      flex: 1,
      minHeight: 120,
      borderRadius: borderRadius.md,
      borderWidth: 2,
      borderColor: theme.colors.border,
      borderStyle: 'dashed',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
      padding: spacing.md,
    },
    pickerBtnCompact: {
      flex: 0,
      width: 100,
      minHeight: 100,
    },
    pickerHint: {
      ...typography.caption,
      color: theme.colors.primary,
      textAlign: 'center',
    },
  });
