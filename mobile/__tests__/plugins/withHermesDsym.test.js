const fs = require('fs');
const os = require('os');
const path = require('path');

const { patchPbxproj, MARKER, PHASE_ID } = require('../../plugins/withHermesDsym');

describe('withHermesDsym', () => {
  it('adds Generate Hermes dSYM build phase after Embed Pods Frameworks', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hermes-dsym-'));
    const pbxDir = path.join(dir, 'TrimiT.xcodeproj');
    fs.mkdirSync(pbxDir);
    const embedId = '1E738626EB40CE4E0D50EDA8';
    const sample = `\t\t\t\t${embedId} /* [CP] Embed Pods Frameworks */,
\t\t\t);
/* End PBXShellScriptBuildPhase section */
`;
    const pbxPath = path.join(pbxDir, 'project.pbxproj');
    fs.writeFileSync(pbxPath, sample, 'utf8');
    expect(patchPbxproj(pbxPath)).toBe(true);
    const text = fs.readFileSync(pbxPath, 'utf8');
    expect(text).toContain(MARKER);
    expect(text).toContain(PHASE_ID);
    expect(text.indexOf(embedId)).toBeLessThan(text.indexOf(PHASE_ID));
  });

  it('is idempotent when marker already present', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hermes-dsym-'));
    const pbxPath = path.join(dir, 'project.pbxproj');
    fs.writeFileSync(pbxPath, `/* ${MARKER} */`, 'utf8');
    expect(patchPbxproj(pbxPath)).toBe(false);
  });
});
