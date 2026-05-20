import { execSync } from 'node:child_process';
import path from 'node:path';
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
  hooks: {
    // packager 가 아이콘 적용·FusesPlugin 패치까지 끝낸 직후의 .app 을 ad-hoc('-') 으로 다시
    // 서명한다. packagerConfig.osxSign 은 @electron/packager 18+ 와의 조합에서 종종 무시되어
    // _CodeSignature 가 비어 있는 상태로 만들기 때문에, 이 hook 으로 직접 codesign 을 호출해
    // 'Mallang Core" is damaged' / 'invalid Info.plist' 에러를 막는다.
    // Apple Developer ID 를 받으면 '-' 자리에 실제 identity 를 넣고 entitlements / --options
    // runtime 옵션을 함께 추가한다.
    postPackage: async (_forgeConfig, packageResult) => {
      if (packageResult.platform !== 'darwin') return;
      for (const outputPath of packageResult.outputPaths) {
        const appPath = path.join(outputPath, 'Mallang Core.app');
        execSync(`codesign --force --deep --sign - "${appPath}"`, {
          stdio: 'inherit',
        });
      }
    },
  },
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
      // 설치 마법사(.exe)와 시작메뉴/바탕화면 단축키 아이콘 모두 같은 .ico 를 쓰게 한다.
      setupIcon: 'src/renderer/assets/icons/app.ico',
    }),
    new MakerDMG({
      format: 'ULFO',
      // DMG 마운트 시 볼륨 아이콘과 앱 번들 미리보기가 같은 .icns 로 보이게 한다.
      icon: 'src/renderer/assets/icons/app.icns',
    }),
    new MakerZIP({}, ['darwin']),
    new MakerRpm({
      options: {
        icon: 'src/renderer/assets/icons/app.png',
      },
    }),
    new MakerDeb({
      options: {
        icon: 'src/renderer/assets/icons/app.png',
      },
    }),
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
