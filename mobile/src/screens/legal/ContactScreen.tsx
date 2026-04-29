import React from 'react';
import { LegalScreen } from './LegalScreen';
import { CONTACT_MD } from '../../legal/content';

const ContactScreen: React.FC<{ navigation: any }> = ({ navigation }) => (
  <LegalScreen navigation={navigation} title="Contact Us" content={CONTACT_MD} />
);

export default ContactScreen;
