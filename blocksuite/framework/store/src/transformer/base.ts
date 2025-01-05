import type { BlockModel } from '../model/block/block-model.js';
import type { DraftModel } from '../model/block/draft.js';
import {
  type InternalPrimitives,
  internalPrimitives,
} from '../model/block/zod.js';
import type { AssetsManager } from './assets.js';
import { fromJSON, toJSON } from './json.js';
import type { BlockSnapshot } from './type.js';

export type BlockSnapshotLeaf = Pick<
  BlockSnapshot,
  'id' | 'flavour' | 'props' | 'version'
>;

export type FromSnapshotPayload = {
  json: BlockSnapshotLeaf;
  assets: AssetsManager;
  children: BlockSnapshot[];
};

export type ToSnapshotPayload<Props extends object> = {
  model: DraftModel<BlockModel<Props>>;
  assets: AssetsManager;
};

export type SnapshotNode<Props extends object> = {
  id: string;
  flavour: string;
  version: number;
  props: Props;
};

export class BaseBlockTransformer<Props extends object = object> {
  protected _internal: InternalPrimitives = internalPrimitives;

  protected _propsFromSnapshot(propsJson: Record<string, unknown>) {
    return Object.fromEntries(
      Object.entries(propsJson).map(([key, value]) => {
        return [key, fromJSON(value)];
      })
    ) as Props;
  }

  protected _propsToSnapshot(model: DraftModel) {
    return Object.fromEntries(
      model.keys.map(key => {
        const value = model[key as keyof typeof model];
        return [key, toJSON(value)];
      })
    );
  }

  fromSnapshot({
    json,
  }: FromSnapshotPayload): Promise<SnapshotNode<Props>> | SnapshotNode<Props> {
    const { flavour, id, version, props: _props } = json;

    const props = this._propsFromSnapshot(_props);

    return {
      id,
      flavour,
      version: version ?? -1,
      props,
    };
  }

  toSnapshot({ model }: ToSnapshotPayload<Props>): BlockSnapshotLeaf {
    const { id, flavour, version } = model;

    const props = this._propsToSnapshot(model);

    return {
      id,
      flavour,
      version,
      props,
    };
  }
}
