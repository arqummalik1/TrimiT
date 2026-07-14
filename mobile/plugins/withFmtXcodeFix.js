/**
 * Xcode 26+ / Apple Clang breaks fmt 11.x (via RCT-Folly) with:
 *   Call to consteval function 'fmt::basic_format_string<...>' is not a constant expression
 *
 * Force the `fmt` pod to C++17 (no consteval) and disable FMT_USE_CONSTEVAL in base.h.
 * Survives `expo prebuild` by rewriting ios/Podfile post_install.
 */
const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const MARKER = 'Xcode 26 fmt workaround';

const POST_INSTALL_SNIPPET = `
    # ${MARKER}: Apple Clang rejects FMT_STRING consteval in fmt 11.x (RN/Expo)
    installer.pods_project.targets.each do |target|
      if target.name == 'fmt'
        target.build_configurations.each do |cfg|
          cfg.build_settings['CLANG_CXX_LANGUAGE_STANDARD'] = 'c++17'
        end
      end
    end
    fmt_base = File.join(installer.sandbox.root, 'fmt', 'include', 'fmt', 'base.h')
    if File.exist?(fmt_base)
      content = File.read(fmt_base)
      unless content.include?('${MARKER}')
        patched = content.gsub(
          /^(#\\s*define FMT_USE_CONSTEVAL) 1$/m,
          "// ${MARKER}\\n\\\\1 0"
        )
        if patched != content
          File.chmod(0644, fmt_base)
          File.write(fmt_base, patched)
        end
      end
    end
`;

function withFmtXcodeFix(config) {
  return withDangerousMod(config, [
    'ios',
    async (cfg) => {
      const podfilePath = path.join(cfg.modRequest.platformProjectRoot, 'Podfile');
      if (!fs.existsSync(podfilePath)) {
        return cfg;
      }
      let contents = fs.readFileSync(podfilePath, 'utf8');
      if (contents.includes(MARKER)) {
        return cfg;
      }

      // Insert before the final `end` of the post_install block that calls react_native_post_install
      const needle = /react_native_post_install\([\s\S]*?\)\n/;
      if (!needle.test(contents)) {
        return cfg;
      }
      contents = contents.replace(needle, (match) => `${match}${POST_INSTALL_SNIPPET}`);
      fs.writeFileSync(podfilePath, contents);
      return cfg;
    },
  ]);
}

module.exports = withFmtXcodeFix;
