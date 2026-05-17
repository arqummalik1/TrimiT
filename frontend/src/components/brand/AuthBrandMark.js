import React from 'react';
import TrimitLogo from './TrimitLogo';

/** Centered transparent logo for auth pages. */
export function AuthBrandMark({ className = '' }) {
  return (
    <div className={`flex justify-center mb-6 ${className}`}>
      <TrimitLogo
        variant="icon"
        asLink={false}
        iconClassName="h-16 w-16"
        showWordmark={false}
      />
    </div>
  );
}

export default AuthBrandMark;
