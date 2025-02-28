import type * as BlocksuiteBlocks from '@blocksuite/affine/blocks';
import type { IVec, XYWH } from '@blocksuite/global/utils';
import { expect, type Locator, type Page } from '@playwright/test';

declare type _GLOBAL_ = typeof BlocksuiteBlocks;

const AFFINE_FORMAT_BAR_WIDGET = 'affine-format-bar-widget';
const EDGELESS_ELEMENT_TOOLBAR_WIDGET = 'edgeless-element-toolbar-widget';
const EDGELESS_TOOLBAR_WIDGET = 'edgeless-toolbar-widget';

export function locateModeSwitchButton(
  page: Page,
  mode: 'page' | 'edgeless',
  active?: boolean
) {
  // switch is implemented as RadioGroup button,
  // so we can use aria-checked to determine the active state
  const checkedSelector = active ? '[aria-checked="true"]' : '';

  return page.locator(
    `[data-testid="switch-${mode}-mode-button"]${checkedSelector}`
  );
}

export async function clickEdgelessModeButton(page: Page) {
  await locateModeSwitchButton(page, 'edgeless').click({ delay: 50 });
  await ensureInEdgelessMode(page);
}

export async function clickPageModeButton(page: Page) {
  await locateModeSwitchButton(page, 'page').click({ delay: 50 });
  await ensureInPageMode(page);
}

export async function ensureInPageMode(page: Page) {
  await expect(locateModeSwitchButton(page, 'page', true)).toBeVisible();
}

export async function ensureInEdgelessMode(page: Page) {
  await expect(locateModeSwitchButton(page, 'edgeless', true)).toBeVisible();
  // wait zoom animation
  await page.waitForTimeout(500);
}

export async function getPageMode(page: Page): Promise<'page' | 'edgeless'> {
  if (await locateModeSwitchButton(page, 'page', true).isVisible()) {
    return 'page';
  }
  if (await locateModeSwitchButton(page, 'edgeless', true).isVisible()) {
    return 'edgeless';
  }
  throw new Error('Unknown mode');
}

export function locateEditorContainer(page: Page, editorIndex = 0) {
  return page.locator('[data-affine-editor-container]').nth(editorIndex);
}

export function locateDocTitle(page: Page, editorIndex = 0) {
  return locateEditorContainer(page, editorIndex).locator('doc-title');
}

export async function focusDocTitle(page: Page, editorIndex = 0) {
  await locateDocTitle(page, editorIndex).locator('.inline-editor').focus();
}

// ================== Page ==================
export function locateFormatBar(page: Page, editorIndex = 0) {
  return locateEditorContainer(page, editorIndex).locator(
    AFFINE_FORMAT_BAR_WIDGET
  );
}

// ================== Edgeless ==================

export async function getEdgelessSelectedIds(page: Page, editorIndex = 0) {
  const container = locateEditorContainer(page, editorIndex);
  return container.evaluate(container => {
    const root = container.querySelector('affine-edgeless-root');
    if (!root) {
      throw new Error('Edgeless root not found');
    }
    return root.gfx.selection.selectedIds;
  });
}

export async function getSelectedXYWH(
  page: Page,
  index = 0,
  editorIndex = 0
): Promise<[number, number, number, number]> {
  const container = locateEditorContainer(page, editorIndex);
  return container.evaluate((container, index) => {
    const root = container.querySelector('affine-edgeless-root');
    if (!root) {
      throw new Error('Edgeless root not found');
    }
    const selected = root.service.selection.selectedElements[index];
    return selected.elementBound.toXYWH();
  }, index);
}

export async function getViewportCenter(page: Page, editorIndex = 0) {
  const container = locateEditorContainer(page, editorIndex);
  return container.evaluate(container => {
    const root = container.querySelector('affine-edgeless-root');
    if (!root) {
      throw new Error('Edgeless root not found');
    }
    return root.gfx.viewport.center;
  });
}

export async function setViewportCenter(
  page: Page,
  center: IVec,
  editorIndex = 0
) {
  const container = locateEditorContainer(page, editorIndex);
  return container.evaluate((container, center) => {
    const root = container.querySelector('affine-edgeless-root');
    if (!root) {
      throw new Error('Edgeless root not found');
    }
    root.gfx.viewport.setCenter(center[0], center[1]);
  }, center);
}

export async function setViewportZoom(page: Page, zoom = 1, editorIndex = 0) {
  const container = locateEditorContainer(page, editorIndex);
  return container.evaluate((container, zoom) => {
    const root = container.querySelector('affine-edgeless-root');
    if (!root) {
      throw new Error('Edgeless root not found');
    }
    root.gfx.viewport.setZoom(zoom);
  }, zoom);
}

/**
 * Convert a canvas point to view coordinate
 * @param point the coordinate on the canvas
 */
export async function toViewCoord(page: Page, point: IVec, editorIndex = 0) {
  const container = locateEditorContainer(page, editorIndex);
  return container.evaluate((container, point) => {
    const root = container.querySelector('affine-edgeless-root');
    if (!root) {
      throw new Error('Edgeless root not found');
    }
    const coord = root.gfx.viewport.toViewCoord(point[0], point[1]);
    coord[0] += root.gfx.viewport.left;
    coord[1] += root.gfx.viewport.top;
    return coord;
  }, point);
}

/**
 * Convert a view coordinate to canvas point
 * @param point the coordinate on the view
 */
export async function toModelCoord(page: Page, point: IVec, editorIndex = 0) {
  const container = locateEditorContainer(page, editorIndex);
  return container.evaluate((container, point) => {
    const root = container.querySelector('affine-edgeless-root');
    if (!root) {
      throw new Error('Edgeless root not found');
    }
    return root.gfx.viewport.toModelCoordFromClientCoord(point);
  }, point);
}

/**
 * Move to a point on the canvas
 */
export async function moveToView(page: Page, point: IVec, editorIndex = 0) {
  const [x, y] = await toViewCoord(page, point, editorIndex);
  await page.mouse.move(x, y);
}

/**
 * Click a point on the canvas
 * @param point the coordinate on the canvas
 */
export async function clickView(page: Page, point: IVec, editorIndex = 0) {
  const [x, y] = await toViewCoord(page, point, editorIndex);
  await page.mouse.click(x, y);
}

/**
 * Double click a point on the canvas
 * @param point the coordinate on the canvas
 */
export async function dblclickView(page: Page, point: IVec, editorIndex = 0) {
  const [x, y] = await toViewCoord(page, point, editorIndex);
  await page.mouse.dblclick(x, y);
}

export async function dragView(
  page: Page,
  from: IVec,
  to: IVec,
  editorIndex = 0
) {
  const [x1, y1] = await toViewCoord(page, from, editorIndex);
  const [x2, y2] = await toViewCoord(page, to, editorIndex);
  await page.mouse.move(x1, y1);
  await page.mouse.down();
  await page.mouse.move(x2, y2);
  await page.mouse.up();
}

export function locateEdgelessToolbar(page: Page, editorIndex = 0) {
  return locateEditorContainer(page, editorIndex).locator(
    EDGELESS_TOOLBAR_WIDGET
  );
}

type EdgelessTool =
  | 'default'
  | 'pan'
  | 'note'
  | 'shape'
  | 'brush'
  | 'eraser'
  | 'text'
  | 'connector'
  | 'frame'
  | 'frameNavigator'
  | 'lasso';

/**
 * @param type the type of the tool in the toolbar
 * @param innerContainer the button may have an inner container
 */
export async function locateEdgelessToolButton(
  page: Page,
  type: EdgelessTool,
  innerContainer = true,
  editorIndex = 0
) {
  const toolbar = locateEdgelessToolbar(page, editorIndex);

  const selector = {
    default: '.edgeless-default-button',
    pan: '.edgeless-default-button',
    shape: '.edgeless-shape-button',
    brush: '.edgeless-brush-button',
    eraser: '.edgeless-eraser-button',
    text: '.edgeless-mindmap-button',
    connector: '.edgeless-connector-button',
    note: '.edgeless-note-button',
    frame: '.edgeless-frame-button',
    frameNavigator: '.edgeless-frame-navigator-button',
    lasso: '.edgeless-lasso-button',
  }[type];

  let buttonType;
  switch (type) {
    case 'brush':
    case 'text':
    case 'eraser':
    case 'shape':
    case 'note':
      buttonType = 'edgeless-toolbar-button';
      break;
    default:
      buttonType = 'edgeless-tool-icon-button';
  }

  const locateEdgelessToolButtonSenior = async (
    selector: string
  ): Promise<Locator> => {
    const target = toolbar.locator(selector);
    const visible = await target.isVisible();
    if (visible) return target;
    // try to click next page
    const nextButton = toolbar.locator(
      '.senior-nav-button-wrapper.next > icon-button'
    );
    const nextExists = await nextButton.count();
    const isDisabled =
      // oxlint-disable-next-line unicorn/prefer-dom-node-dataset
      (await nextButton.getAttribute('data-test-disabled')) === 'true';
    if (!nextExists || isDisabled) return target;
    await nextButton.click();
    await page.waitForTimeout(200);
    return locateEdgelessToolButtonSenior(selector);
  };

  const button = await locateEdgelessToolButtonSenior(
    `${buttonType}${selector}`
  );

  return innerContainer ? button.locator('.icon-container') : button;
}

export enum Shape {
  Diamond = 'Diamond',
  Ellipse = 'Ellipse',
  'Rounded rectangle' = 'Rounded rectangle',
  Square = 'Square',
  Triangle = 'Triangle',
}

/**
 * Set edgeless tool by clicking button in edgeless toolbar
 */
export async function setEdgelessTool(
  page: Page,
  tool: EdgelessTool,
  shape = Shape.Square,
  editorIndex = 0
) {
  const toolbar = locateEdgelessToolbar(page, editorIndex);

  switch (tool) {
    // text tool is removed, use shortcut to trigger
    case 'text':
      await page.keyboard.press('t', { delay: 100 });
      break;
    case 'default': {
      const button = await locateEdgelessToolButton(
        page,
        'default',
        false,
        editorIndex
      );
      const classes = (await button.getAttribute('class'))?.split(' ');
      if (!classes?.includes('default')) {
        await button.click();
        await page.waitForTimeout(100);
      }
      break;
    }
    case 'pan': {
      const button = await locateEdgelessToolButton(
        page,
        'default',
        false,
        editorIndex
      );
      const classes = (await button.getAttribute('class'))?.split(' ');
      if (classes?.includes('default')) {
        await button.click();
        await page.waitForTimeout(100);
      } else if (classes?.includes('pan')) {
        await button.click(); // change to default
        await page.waitForTimeout(100);
        await button.click(); // change to pan
        await page.waitForTimeout(100);
      }
      break;
    }
    case 'lasso':
    case 'note':
    case 'brush':
    case 'eraser':
    case 'frame':
    case 'connector': {
      const button = await locateEdgelessToolButton(
        page,
        tool,
        false,
        editorIndex
      );
      await button.click();
      break;
    }
    case 'shape': {
      const shapeToolButton = await locateEdgelessToolButton(
        page,
        'shape',
        false,
        editorIndex
      );
      // Avoid clicking on the shape-element (will trigger dragging mode)
      await shapeToolButton.click({ position: { x: 5, y: 5 } });

      const squareShapeButton = toolbar
        .locator('edgeless-slide-menu edgeless-tool-icon-button')
        .filter({ hasText: shape });
      await squareShapeButton.click();
      break;
    }
  }
}

export async function resizeElementByHandle(
  page: Page,
  delta: IVec,
  corner:
    | 'top-left'
    | 'top-right'
    | 'bottom-right'
    | 'bottom-left' = 'top-left',
  editorIndex = 0
) {
  const handle = page.locator(`.handle[aria-label="${corner}"] .resize`);
  const box = await handle.boundingBox();
  if (box === null) throw new Error();
  const from = await toModelCoord(
    page,
    [box.x + box.width / 2, box.y + box.height / 2],
    editorIndex
  );
  const to: IVec = [from[0] + delta[0], from[1] + delta[1]];
  await dragView(page, from, to, editorIndex);
}

export function locateElementToolbar(page: Page, editorIndex = 0) {
  return locateEditorContainer(page, editorIndex).locator(
    EDGELESS_ELEMENT_TOOLBAR_WIDGET
  );
}

/**
 * Create a not block in canvas
 * @param position the position or xwyh of the note block in canvas
 */
export async function createEdgelessNoteBlock(
  page: Page,
  position: IVec | XYWH,
  editorIndex = 0
) {
  await setEdgelessTool(page, 'note', undefined, editorIndex);
  if (position.length === 4) {
    dragView(
      page,
      [position[0], position[1]],
      [position[0] + position[2], position[1] + position[3]]
    );
  } else {
    await clickView(page, position, editorIndex);
  }
}
