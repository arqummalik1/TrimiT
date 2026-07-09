import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  type NativeSyntheticEvent,
  type TextLayoutEventData,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import type { Theme } from '../theme/tokens';
import { fonts } from '../theme/tokens';

interface SalonDescriptionProps {
  text: string;
}

export function SalonDescription({ text }: SalonDescriptionProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [expanded, setExpanded] = useState(false);
  const [truncated, setTruncated] = useState(false);

  const handleMeasureLayout = (event: NativeSyntheticEvent<TextLayoutEventData>) => {
    setTruncated(event.nativeEvent.lines.length > 1);
  };

  return (
    <View style={styles.block}>
      {!expanded && (
        <Text
          style={[styles.text, styles.measure]}
          onTextLayout={handleMeasureLayout}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          {text}
        </Text>
      )}
      <Text style={styles.text} numberOfLines={expanded ? undefined : 1}>
        {text}
      </Text>
      {truncated && !expanded ? (
        <TouchableOpacity
          onPress={() => setExpanded(true)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Read more salon description"
        >
          <Text style={styles.readMore}>Read more</Text>
        </TouchableOpacity>
      ) : null}
      {expanded && truncated ? (
        <TouchableOpacity
          onPress={() => setExpanded(false)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Show less salon description"
        >
          <Text style={styles.readMore}>Read less</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

export function createSalonDescriptionStyles(theme: Theme) {
  return createStyles(theme);
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    block: {
      marginBottom: 0,
    },
    text: {
      fontFamily: fonts.body,
      color: theme.colors.textSecondary,
      fontSize: 13,
      lineHeight: 18,
    },
    measure: {
      position: 'absolute',
      opacity: 0,
      width: '100%',
      zIndex: -1,
    },
    readMore: {
      marginTop: 4,
      fontFamily: fonts.bodySemiBold,
      fontSize: 13,
      lineHeight: 18,
      color: theme.colors.primary,
    },
  });
