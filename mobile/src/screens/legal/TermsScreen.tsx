import React from 'react';
import { LegalScreen } from './LegalScreen';
import { TERMS_MD } from '../../legal/content';

const TermsScreen: React.FC<{ navigation: any }> = ({ navigation }) => (
  <LegalScreen navigation={navigation} title="Terms of Service" content={TERMS_MD} />
);

export default TermsScreen;
