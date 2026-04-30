import React, { useState, useRef } from 'react';
import {
  View,
  Image,
  FlatList,
  StyleSheet,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { borderRadius, DEFAULT_SALON_IMAGE } from '../lib/utils';
import { useTheme } from '../theme/ThemeContext';



const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ImageCarouselProps {
  images: string[];
  height?: number;
}

export default function ImageCarousel({ images, height = 280 }: ImageCarouselProps) {
  const { theme } = useTheme();
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const displayImages = images.length > 0 ? images : [DEFAULT_SALON_IMAGE];

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setActiveIndex(index);
  };

  return (
    <View style={[styles.container, { height }]}>
      <FlatList
        ref={flatListRef}
        data={displayImages}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        keyExtractor={(_, index) => index.toString()}
        renderItem={({ item }) => (
          <Image
            source={{ uri: item }}
            style={[styles.image, { height, width: SCREEN_WIDTH, backgroundColor: theme.colors.shimmer }]}
            resizeMode="cover"
          />
        )}
      />
      {displayImages.length > 1 && (
        <View style={styles.pagination}>
          {displayImages.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                index === activeIndex
                  ? [styles.dotActive, { backgroundColor: '#FFFFFF' }]
                  : { backgroundColor: 'rgba(255,255,255,0.5)' },
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  image: {
    // backgroundColor applied inline from theme
  },
  pagination: {
    position: 'absolute',
    bottom: 16,
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
  dotInactive: {},
});
