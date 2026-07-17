const { withAndroidManifest } = require('@expo/config-plugins');

const AD_ID_PERMISSION = 'com.google.android.gms.permission.AD_ID';

function withRemoveAdId(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;

    if (!manifest['uses-permission']) {
      manifest['uses-permission'] = [];
    }

    // Remove any existing entry for AD_ID first, to avoid duplicates
    manifest['uses-permission'] = manifest['uses-permission'].filter(
      (perm) => perm.$['android:name'] !== AD_ID_PERMISSION
    );

    // Add it back in with tools:node="remove" so it's stripped from the final merged manifest
    manifest['uses-permission'].push({
      $: {
        'android:name': AD_ID_PERMISSION,
        'tools:node': 'remove',
      },
    });

    // Make sure the manifest declares the "tools" namespace, or tools:node is ignored
    if (!manifest.$['xmlns:tools']) {
      manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';
    }

    return config;
  });
}

module.exports = withRemoveAdId;