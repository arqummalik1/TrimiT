import React from 'react';
import MarkdownView from '../../components/MarkdownView';

const LegalLayout = ({ content }) => {
  return (
    <div className="min-h-screen bg-stone-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <MarkdownView content={content} />
      </div>
    </div>
  );
};

export default LegalLayout;
