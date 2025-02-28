import { ConnectorMode, getConnectorModeName } from '@blocksuite/affine-model';
import { EditPropsStore } from '@blocksuite/affine-shared/services';
import { SignalWatcher } from '@blocksuite/global/utils';
import {
  ConnectorCIcon,
  ConnectorEIcon,
  ConnectorLIcon,
} from '@blocksuite/icons/lit';
import { computed } from '@preact/signals-core';
import { css, html, LitElement } from 'lit';

import { getTooltipWithShortcut } from '../../utils.js';
import { QuickToolMixin } from '../mixins/quick-tool.mixin.js';

const IcomMap = {
  [ConnectorMode.Straight]: ConnectorLIcon(),
  [ConnectorMode.Orthogonal]: ConnectorEIcon(),
  [ConnectorMode.Curve]: ConnectorCIcon(),
};

export class EdgelessConnectorToolButton extends QuickToolMixin(
  SignalWatcher(LitElement)
) {
  static override styles = css`
    :host {
      display: flex;
    }
  `;

  private readonly _mode$ = computed(() => {
    return this.edgeless.std.get(EditPropsStore).lastProps$.value.connector
      .mode;
  });

  override type = 'connector' as const;

  private _toggleMenu() {
    if (this.tryDisposePopper()) return;

    const menu = this.createPopper('edgeless-connector-menu', this);
    menu.element.edgeless = this.edgeless;
    menu.element.onChange = (props: Record<string, unknown>) => {
      this.edgeless.std.get(EditPropsStore).recordLastProps('connector', props);
      this.setEdgelessTool(this.type, {
        mode: this._mode$.value,
      });
    };
  }

  override render() {
    const { active } = this;
    const mode = this._mode$.value;
    return html`
      <edgeless-tool-icon-button
        class="edgeless-connector-button"
        .tooltip=${this.popper
          ? ''
          : getTooltipWithShortcut(getConnectorModeName(mode), 'C')}
        .tooltipOffset=${17}
        .active=${active}
        .iconContainerPadding=${6}
        .iconSize=${'24px'}
        @click=${() => {
          // don't update tool before toggling menu
          this._toggleMenu();
          this.edgeless.gfx.tool.setTool('connector', {
            mode,
          });
        }}
      >
        ${IcomMap[mode]}
        <toolbar-arrow-up-icon></toolbar-arrow-up-icon>
      </edgeless-tool-icon-button>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'edgeless-connector-tool-button': EdgelessConnectorToolButton;
  }
}
