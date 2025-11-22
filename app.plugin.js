const { withPodfile } = require('@expo/config-plugins');

module.exports = function withFirebasePodfileModifications(config) {
  return withPodfile(config, async (config) => {
    config.modResults.contents = addUseModularHeaders(config.modResults.contents);
    return config;
  });
};

function addUseModularHeaders(podfileContent) {
  // Check if use_modular_headers! is already present
  if (podfileContent.includes('use_modular_headers!')) {
    return podfileContent;
  }

  // Add use_modular_headers! after the first target block
  const lines = podfileContent.split('\n');
  let targetIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().startsWith('target')) {
      targetIndex = i;
      break;
    }
  }

  if (targetIndex !== -1) {
    // Find the line after 'do' or right after target declaration
    let insertIndex = targetIndex + 1;
    for (let i = targetIndex + 1; i < lines.length; i++) {
      if (lines[i].trim() === 'do' || lines[i].trim().startsWith('platform')) {
        insertIndex = i + 1;
        break;
      }
    }

    // Insert use_modular_headers!
    lines.splice(insertIndex, 0, '    use_modular_headers!');
    return lines.join('\n');
  }

  return podfileContent;
}
