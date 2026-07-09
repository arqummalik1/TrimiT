import React, { useState, useRef } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { Image, ImageSource } from 'expo-image';
import { useTheme } from '../theme/ThemeContext';
import { resolveSalonCarouselSources } from '../lib/salonImage';
import type { Salon } from '../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/** Clears the salon detail content sheet overlap plus breathing room. */
export const CAROUSEL_PAGINATION_BOTTOM = 26;

export function carouselDotColor(theme: { colors: { textSecondary: string; textTertiary: string } }, isActive: boolean): string {
  return isActive ? theme.colors.textSecondary : theme.colors.textTertiary;
}

interface ImageCarouselProps {
  /** Remote URLs (legacy) — prefer `sources` or `salon`. */
  images?: string[];
  /** Full expo-image sources (remote URI or local require). */
  sources?: ImageSource[];
  /** Salon hero — resolves images + TrimiT logo fallback. */
  salon?: Partial<Salon>;
  height?: number;
}

export default function ImageCarousel({
  images,
  sources,
  salon,
  height = 280,
}: ImageCarouselProps) {
  const { theme } = useTheme();
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const displaySources: ImageSource[] = React.useMemo(() => {
    if (sources && sources.length > 0) return sources;
    if (salon) return resolveSalonCarouselSources(salon);
    if (images && images.length > 0) return images.map((uri) => ({ uri }));
    return resolveSalonCarouselSources({});
  }, [sources, salon, images]);

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setActiveIndex(index);
  };

  return (
    <View style={[styles.container, { height }]}>
      <FlatList
        ref={flatListRef}
        data={displaySources}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        keyExtractor={(_, index) => String(index)}
        renderItem={({ item }) => (
          <Image
            source={item}
            style={[
              styles.image,
              { height, width: SCREEN_WIDTH, backgroundColor: theme.colors.shimmer },
            ]}
            contentFit="cover"
            transition={300}
          />
        )}
      />
      {displaySources.length > 1 && (
        <View style={[styles.pagination, { bottom: CAROUSEL_PAGINATION_BOTTOM }]}>
          {displaySources.map((_, index) => {
            const isActive = index === activeIndex;
            return (
              <View
                key={index}
                style={[
                  styles.dot,
                  isActive && styles.dotActive,
                  { backgroundColor: carouselDotColor(theme, isActive) },
                ]}
              />
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  image: {},
  pagination: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    width: 24,
  },
});
