import { html, LitElement } from 'lit';
import { customElement } from 'lit/decorators.js';
import { nanoid } from 'nanoid';
import { useCallback, useMemo, useState } from 'react';
import ReactDOM from 'react-dom';

type PortalEvent = {
  name: 'connectedCallback' | 'disconnectedCallback' | 'willUpdate';
  target: LitReactPortal;
  previousPortalId?: string;
};

type PortalListener = (event: PortalEvent) => void;

export function createLitPortalAnchor(callback: (event: PortalEvent) => void) {
  const id = nanoid();
  return html`<lit-react-portal
    .notify=${callback}
    portalId=${id}
  ></lit-react-portal>`;
}

export const LIT_REACT_PORTAL = 'lit-react-portal';

@customElement(LIT_REACT_PORTAL)
class LitReactPortal extends LitElement {
  portalId!: string;

  notify!: PortalListener;

  static override get properties() {
    return {
      portalId: { type: String },
      notify: { attribute: false },
    };
  }

  override attributeChangedCallback(
    name: string,
    oldVal: string,
    newVal: string
  ) {
    super.attributeChangedCallback(name, oldVal, newVal);
    if (name.toLowerCase() === 'portalid') {
      this.notify({
        name: 'willUpdate',
        target: this,
        previousPortalId: oldVal,
      });
    }
  }

  // do not enable shadow root
  override createRenderRoot() {
    return this;
  }

  override connectedCallback() {
    this.notify({
      name: 'connectedCallback',
      target: this,
    });
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.notify({
      name: 'disconnectedCallback',
      target: this,
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    [LIT_REACT_PORTAL]: LitReactPortal;
  }
}

export type ElementOrFactory = React.ReactElement | (() => React.ReactElement);

type LitPortal = {
  id: string;
  portal: React.ReactPortal;
};

// returns a factory function that renders a given element to a lit template
export const useLitPortalFactory = () => {
  const [portals, setPortals] = useState<LitPortal[]>([]);

  return [
    useCallback(
      (
        elementOrFactory: React.ReactElement | (() => React.ReactElement),
        rerendering = true
      ) => {
        const element =
          typeof elementOrFactory === 'function'
            ? elementOrFactory()
            : elementOrFactory;
        return createLitPortalAnchor(event => {
          const { name, target } = event;
          const id = target.portalId;

          if (name === 'connectedCallback') {
            setPortals(portals => [
              ...portals,
              {
                id,
                portal: ReactDOM.createPortal(element, target, id),
              },
            ]);
            return;
          }

          if (name === 'disconnectedCallback') {
            setPortals(portals => portals.filter(p => p.id !== id));
            return;
          }

          const prevId = event.previousPortalId;
          // Ignore first `willUpdate`
          if (!prevId) {
            return;
          }

          // No re-rendering allowed
          // Used in `pdf embed view` scenario
          if (!rerendering) {
            return;
          }

          setPortals(portals => {
            const portal = portals.find(p => p.id === prevId);
            if (!portal) return portals;

            portal.id = id;
            portal.portal.key = id;
            portal.portal.children = element;
            return [...portals];
          });
        });
      },
      [setPortals]
    ),
    portals,
  ] as const;
};

// render a react element to a lit template
export const useLitPortal = (
  elementOrFactory: React.ReactElement | (() => React.ReactElement)
) => {
  const [anchor, setAnchor] = useState<HTMLElement>();
  const template = useMemo(
    () =>
      createLitPortalAnchor(event => {
        if (event.name !== 'disconnectedCallback') {
          setAnchor(event.target as HTMLElement);
        } else {
          setAnchor(undefined);
        }
      }),
    []
  );

  const element = useMemo(
    () =>
      typeof elementOrFactory === 'function'
        ? elementOrFactory()
        : elementOrFactory,
    [elementOrFactory]
  );
  return {
    template,
    portal: anchor ? ReactDOM.createPortal(element, anchor) : undefined,
  };
};
