# iOS

AFFiNE iOS app.

## Build

- `yarn install`
- `BUILD_TYPE=canary PUBLIC_PATH="/" yarn workspace @affine/ios build`
- `yarn workspace @affine/ios cap sync`
- `yarn workspace @affine/ios cap open ios`

## Live Reload

> Capacitor doc: https://capacitorjs.com/docs/guides/live-reload#using-with-framework-clis

- `yarn install`
- `yarn dev`
  - select `ios` for the "Distribution" option
- `yarn workspace @affine/ios sync:dev`
- `yarn workspace @affine/ios cap open ios`
