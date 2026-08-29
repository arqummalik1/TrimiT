import { createNavigationContainerRef } from '@react-navigation/native';
import { RootStackParamList } from './types';

// Kept separate from navigator components so protected-action helpers do not
// import the entire navigation tree (and so screen unit tests remain isolated).
export const navigationRef = createNavigationContainerRef<RootStackParamList>();

