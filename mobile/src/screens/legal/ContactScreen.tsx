import React from 'react';
import { LegalScreen } from './LegalScreen';
import { CONTACT_MD } from '../../legal/content';

interface ContactScreenProps {
  navigation: {
    goBack: () => void;
  };
}

const ContactScreen: React.FC<ContactScreenProps> = ({ navigation }) => (
  <LegalScreen navigation={navigation} title="Contact Us" content={CONTACT_MD} />
);

export default ContactScreen;
