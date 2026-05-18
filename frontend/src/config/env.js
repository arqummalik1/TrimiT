/**
 * CRA (REACT_APP_*) and Vite (VITE_*) env compatibility.
 */
export function getEnv(name) {
  const env = typeof import.meta !== 'undefined' ? import.meta.env : {};
  const viteKey = `VITE_${name}`;
  const craKey = `REACT_APP_${name}`;
  if (env[viteKey]) return String(env[viteKey]);
  if (env[craKey]) return String(env[craKey]);
  return '';
}
