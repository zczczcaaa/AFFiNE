import { SafeArea, useThemeColorV2 } from '@affine/component';

import { AppTabs } from '../../components';
import { AllDocList, AllDocsHeader, AllDocsMenu } from '../../views';

export const Component = () => {
  useThemeColorV2('layer/background/mobile/primary');

  return (
    <>
      <AllDocsHeader operations={<AllDocsMenu />} />
      <SafeArea bottom>
        <AllDocList />
      </SafeArea>
      <AppTabs />
    </>
  );
};
