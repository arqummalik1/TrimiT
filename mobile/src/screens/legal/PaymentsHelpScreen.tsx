import React from 'react';
import { LegalScreen } from './LegalScreen';
import { PAYMENTS_HELP_MD } from '../../legal/content';

interface PaymentsHelpScreenProps {
  navigation: {
    goBack: () => void;
  };
}

const PaymentsHelpScreen: React.FC<PaymentsHelpScreenProps> = ({ navigation }) => (
  <LegalScreen navigation={navigation} title="Payments Help" content={PAYMENTS_HELP_MD} />
);

export default PaymentsHelpScreen;
