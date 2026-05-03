import React from 'react';
import { LegalScreen } from './LegalScreen';
import { TERMS_MD } from '../../legal/content';

interface TermsScreenProps {
  navigation: {
    goBack: () => void;
  };
}

const TermsScreen: React.FC<TermsScreenProps> = ({ navigation }) => (
  <LegalScreen navigation={navigation} title="Terms of Service" content={TERMS_MD} />
);

export default TermsScreen;
