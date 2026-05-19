import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import { MakerZIP } from '@electron-forge/maker-zip';
import { MakerDeb } from '@electron-forge/maker-deb';
import { MakerRpm } from '@electron-forge/maker-rpm';
import { MakerDMG } from '@electron-forge/maker-dmg';
import { VitePlugin } from '@electron-forge/plugin-vite';
import { FusesPlugin } from '@electron-forge/plugin-fuses';
import { AutoUnpackNativesPlugin } from '@electron-forge/plugin-auto-unpack-natives';
import { FuseV1Options, FuseVersion } from '@electron/fuses';

const config: ForgeConfig = {
  packagerConfig: {
    name: 'Mallang Core',
    executableName: 'mallang-core',
    appBundleId: 'com.mallang.core',
    asar: true,
    icon: 'src/renderer/assets/icons/app',
  },
  rebuildConfig: {},
  makers: [
    new MakerSquirrel({
      name: 'mallang_core',
      setupExe: 'MallangCoreSetup.exe',
      // Squirrel은 내부적으로 NuGet nuspec을 만드는데, package.json의 author/description이
      // 비어 있으면 'Authors is required'로 실패한다. package.json에 넣어두는 게 우선이지만,
      // 다른 메이커가 같이 돌 때 메타데이터가 흔들리지 않게 여기서도 못 박는다.
      authors: 'Mallang Core Team',
      owners: 'Mallang Core Team',
      title: 'Mallang Core',
      description: '회사에서의 하루를 함께하는 데스크탑 말랑이',
    }),
    new MakerDMG({ format: 'ULFO' }),
    new MakerZIP({}, ['darwin']),
    new MakerRpm({}),
    new MakerDeb({}),
  ],
  plugins: [
    new VitePlugin({
      build: [
        {
          entry: 'src/main/index.ts',
          config: 'vite.main.config.ts',
          target: 'main',
        },
        {
          entry: 'src/preload/preload.ts',
          config: 'vite.preload.config.ts',
          target: 'preload',
        },
      ],
      renderer: [
        {
          name: 'main_window',
          config: 'vite.renderer.config.ts',
        },
      ],
    }),
    new AutoUnpackNativesPlugin({}),
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
};

export default config;
