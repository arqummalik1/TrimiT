import React from 'react';
import { LegalScreen } from './LegalScreen';
import { PRIVACY_MD } from '../../legal/content';

const PrivacyPolicyScreen: React.FC<{ navigation: any }> = ({ navigation }) => (
  <LegalScreen navigation={navigation} title="Privacy Policy" content={PRIVACY_MD} />
);

export default PrivacyPolicyScreen;
