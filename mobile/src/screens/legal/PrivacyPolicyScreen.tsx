import React from 'react';
import { LegalScreen } from './LegalScreen';
import { PRIVACY_MD } from '../../legal/content';

interface PrivacyPolicyScreenProps {
  navigation: {
    goBack: () => void;
  };
}

const PrivacyPolicyScreen: React.FC<PrivacyPolicyScreenProps> = ({ navigation }) => (
  <LegalScreen navigation={navigation} title="Privacy Policy" content={PRIVACY_MD} />
);

export default PrivacyPolicyScreen;
