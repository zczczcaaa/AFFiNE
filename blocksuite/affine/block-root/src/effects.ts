import { EdgelessAutoCompletePanel } from './edgeless/components/auto-complete/auto-complete-panel.js';
import { EdgelessAutoComplete } from './edgeless/components/auto-complete/edgeless-auto-complete.js';
import { EdgelessToolIconButton } from './edgeless/components/buttons/tool-icon-button.js';
import { EdgelessToolbarButton } from './edgeless/components/buttons/toolbar-button.js';
import { EdgelessConnectorHandle } from './edgeless/components/connector/connector-handle.js';
import {
  NOTE_SLICER_WIDGET,
  NoteSlicer,
} from './edgeless/components/note-slicer/index.js';
import { EdgelessAlignPanel } from './edgeless/components/panel/align-panel.js';
import { CardStylePanel } from './edgeless/components/panel/card-style-panel.js';
import {
  EdgelessColorButton,
  EdgelessColorPanel,
  EdgelessTextColorIcon,
} from './edgeless/components/panel/color-panel.js';
import { EdgelessFontFamilyPanel } from './edgeless/components/panel/font-family-panel.js';
import { EdgelessFontWeightAndStylePanel } from './edgeless/components/panel/font-weight-and-style-panel.js';
import { EdgelessLineWidthPanel } from './edgeless/components/panel/line-width-panel.js';
import { NoteDisplayModePanel } from './edgeless/components/panel/note-display-mode-panel.js';
import { EdgelessNoteShadowPanel } from './edgeless/components/panel/note-shadow-panel.js';
import { EdgelessScalePanel } from './edgeless/components/panel/scale-panel.js';
import { EdgelessShapePanel } from './edgeless/components/panel/shape-panel.js';
import { EdgelessShapeStylePanel } from './edgeless/components/panel/shape-style-panel.js';
import { EdgelessSizePanel } from './edgeless/components/panel/size-panel.js';
import { StrokeStylePanel } from './edgeless/components/panel/stroke-style-panel.js';
import {
  EDGELESS_NAVIGATOR_BLACK_BACKGROUND_WIDGET,
  EdgelessNavigatorBlackBackgroundWidget,
} from './edgeless/components/presentation/edgeless-navigator-black-background.js';
import {
  EDGELESS_DRAGGING_AREA_WIDGET,
  EdgelessDraggingAreaRectWidget,
} from './edgeless/components/rects/edgeless-dragging-area-rect.js';
import {
  EDGELESS_SELECTED_RECT_WIDGET,
  EdgelessSelectedRectWidget,
} from './edgeless/components/rects/edgeless-selected-rect.js';
import { EdgelessConnectorLabelEditor } from './edgeless/components/text/edgeless-connector-label-editor.js';
import { EdgelessFrameTitleEditor } from './edgeless/components/text/edgeless-frame-title-editor.js';
import { EdgelessGroupTitleEditor } from './edgeless/components/text/edgeless-group-title-editor.js';
import { EdgelessShapeTextEditor } from './edgeless/components/text/edgeless-shape-text-editor.js';
import { EdgelessTextEditor } from './edgeless/components/text/edgeless-text-editor.js';
import { EdgelessBrushMenu } from './edgeless/components/toolbar/brush/brush-menu.js';
import { EdgelessBrushToolButton } from './edgeless/components/toolbar/brush/brush-tool-button.js';
import { EdgelessSlideMenu } from './edgeless/components/toolbar/common/slide-menu.js';
import { ToolbarArrowUpIcon } from './edgeless/components/toolbar/common/toolbar-arrow-up-icon.js';
import { EdgelessConnectorMenu } from './edgeless/components/toolbar/connector/connector-menu.js';
import { EdgelessConnectorToolButton } from './edgeless/components/toolbar/connector/connector-tool-button.js';
import { EdgelessDefaultToolButton } from './edgeless/components/toolbar/default/default-tool-button.js';
import { EdgelessToolbarWidget } from './edgeless/components/toolbar/edgeless-toolbar.js';
import { EdgelessEraserToolButton } from './edgeless/components/toolbar/eraser/eraser-tool-button.js';
import { EdgelessFrameMenu } from './edgeless/components/toolbar/frame/frame-menu.js';
import { EdgelessFrameToolButton } from './edgeless/components/toolbar/frame/frame-tool-button.js';
import { EdgelessLassoToolButton } from './edgeless/components/toolbar/lasso/lasso-tool-button.js';
import { EdgelessLinkToolButton } from './edgeless/components/toolbar/link/link-tool-button.js';
import { MindMapPlaceholder } from './edgeless/components/toolbar/mindmap/mindmap-importing-placeholder.js';
import { EdgelessMindmapMenu } from './edgeless/components/toolbar/mindmap/mindmap-menu.js';
import { EdgelessMindmapToolButton } from './edgeless/components/toolbar/mindmap/mindmap-tool-button.js';
import { EdgelessNoteMenu } from './edgeless/components/toolbar/note/note-menu.js';
import { EdgelessNoteSeniorButton } from './edgeless/components/toolbar/note/note-senior-button.js';
import { EdgelessNoteToolButton } from './edgeless/components/toolbar/note/note-tool-button.js';
import { EdgelessFrameOrderButton } from './edgeless/components/toolbar/present/frame-order-button.js';
import { EdgelessFrameOrderMenu } from './edgeless/components/toolbar/present/frame-order-menu.js';
import { EdgelessNavigatorSettingButton } from './edgeless/components/toolbar/present/navigator-setting-button.js';
import { EdgelessPresentButton } from './edgeless/components/toolbar/present/present-button.js';
import { PresentationToolbar } from './edgeless/components/toolbar/presentation-toolbar.js';
import { EdgelessToolbarShapeDraggable } from './edgeless/components/toolbar/shape/shape-draggable.js';
import { EdgelessShapeMenu } from './edgeless/components/toolbar/shape/shape-menu.js';
import { EdgelessShapeToolButton } from './edgeless/components/toolbar/shape/shape-tool-button.js';
import { EdgelessShapeToolElement } from './edgeless/components/toolbar/shape/shape-tool-element.js';
import { OverlayScrollbar } from './edgeless/components/toolbar/template/overlay-scrollbar.js';
import { AffineTemplateLoading } from './edgeless/components/toolbar/template/template-loading.js';
import { EdgelessTemplatePanel } from './edgeless/components/toolbar/template/template-panel.js';
import { EdgelessTemplateButton } from './edgeless/components/toolbar/template/template-tool-button.js';
import { EdgelessTextMenu } from './edgeless/components/toolbar/text/text-menu.js';
import {
  AFFINE_AI_PANEL_WIDGET,
  AFFINE_EDGELESS_COPILOT_WIDGET,
  AFFINE_EMBED_CARD_TOOLBAR_WIDGET,
  AFFINE_FORMAT_BAR_WIDGET,
  AffineAIPanelWidget,
  AffineFormatBarWidget,
  AffineImageToolbarWidget,
  AffineModalWidget,
  EDGELESS_TOOLBAR_WIDGET,
  EdgelessCopilotToolbarEntry,
  EdgelessCopilotWidget,
  EdgelessRootBlockComponent,
  EdgelessRootPreviewBlockComponent,
  EmbedCardToolbar,
  FramePreview,
  PageRootBlockComponent,
  PreviewRootBlockComponent,
} from './index.js';
import { AIPanelDivider } from './widgets/ai-panel/components/divider.js';
import { AIFinishTip } from './widgets/ai-panel/components/finish-tip.js';
import { GeneratingPlaceholder } from './widgets/ai-panel/components/generating-placeholder.js';
import {
  AIPanelAnswer,
  AIPanelError,
  AIPanelGenerating,
  AIPanelInput,
} from './widgets/ai-panel/components/index.js';
import { EdgelessCopilotPanel } from './widgets/edgeless-copilot-panel/index.js';
import {
  AFFINE_EDGELESS_ZOOM_TOOLBAR_WIDGET,
  AffineEdgelessZoomToolbarWidget,
} from './widgets/edgeless-zoom-toolbar/index.js';
import { ZoomBarToggleButton } from './widgets/edgeless-zoom-toolbar/zoom-bar-toggle-button.js';
import { EdgelessZoomToolbar } from './widgets/edgeless-zoom-toolbar/zoom-toolbar.js';
import { effects as widgetEdgelessElementToolbarEffects } from './widgets/element-toolbar/effects.js';
import { AffineImageToolbar } from './widgets/image-toolbar/components/image-toolbar.js';
import { AFFINE_IMAGE_TOOLBAR_WIDGET } from './widgets/image-toolbar/index.js';
import {
  AFFINE_INNER_MODAL_WIDGET,
  AffineInnerModalWidget,
} from './widgets/inner-modal/inner-modal.js';
import { effects as widgetMobileToolbarEffects } from './widgets/keyboard-toolbar/effects.js';
import { effects as widgetLinkedDocEffects } from './widgets/linked-doc/effects.js';
import { Loader } from './widgets/linked-doc/import-doc/loader.js';
import { AffineCustomModal } from './widgets/modal/custom-modal.js';
import { AFFINE_MODAL_WIDGET } from './widgets/modal/modal.js';
import {
  AFFINE_PAGE_DRAGGING_AREA_WIDGET,
  AffinePageDraggingAreaWidget,
} from './widgets/page-dragging-area/page-dragging-area.js';
import {
  AFFINE_SLASH_MENU_WIDGET,
  AffineSlashMenuWidget,
} from './widgets/slash-menu/index.js';
import {
  InnerSlashMenu,
  SlashMenu,
} from './widgets/slash-menu/slash-menu-popover.js';
import {
  AFFINE_SURFACE_REF_TOOLBAR,
  AffineSurfaceRefToolbar,
} from './widgets/surface-ref-toolbar/surface-ref-toolbar.js';
import {
  AFFINE_VIEWPORT_OVERLAY_WIDGET,
  AffineViewportOverlayWidget,
} from './widgets/viewport-overlay/viewport-overlay.js';

export function effects() {
  widgetEdgelessElementToolbarEffects();
  widgetMobileToolbarEffects();
  widgetLinkedDocEffects();

  customElements.define('affine-page-root', PageRootBlockComponent);
  customElements.define('affine-preview-root', PreviewRootBlockComponent);
  customElements.define('affine-edgeless-root', EdgelessRootBlockComponent);
  customElements.define('edgeless-copilot-panel', EdgelessCopilotPanel);
  customElements.define(
    'edgeless-copilot-toolbar-entry',
    EdgelessCopilotToolbarEntry
  );
  customElements.define('edgeless-connector-handle', EdgelessConnectorHandle);
  customElements.define('edgeless-zoom-toolbar', EdgelessZoomToolbar);
  customElements.define(
    'affine-edgeless-root-preview',
    EdgelessRootPreviewBlockComponent
  );
  customElements.define('affine-custom-modal', AffineCustomModal);
  customElements.define('affine-slash-menu', SlashMenu);
  customElements.define('inner-slash-menu', InnerSlashMenu);
  customElements.define('generating-placeholder', GeneratingPlaceholder);
  customElements.define('ai-finish-tip', AIFinishTip);
  customElements.define('ai-panel-divider', AIPanelDivider);
  customElements.define(NOTE_SLICER_WIDGET, NoteSlicer);
  customElements.define(
    EDGELESS_NAVIGATOR_BLACK_BACKGROUND_WIDGET,
    EdgelessNavigatorBlackBackgroundWidget
  );
  customElements.define('zoom-bar-toggle-button', ZoomBarToggleButton);
  customElements.define(
    EDGELESS_DRAGGING_AREA_WIDGET,
    EdgelessDraggingAreaRectWidget
  );
  customElements.define('loader-element', Loader);
  customElements.define('edgeless-brush-menu', EdgelessBrushMenu);
  customElements.define('edgeless-brush-tool-button', EdgelessBrushToolButton);
  customElements.define(
    'edgeless-connector-tool-button',
    EdgelessConnectorToolButton
  );
  customElements.define(
    'edgeless-default-tool-button',
    EdgelessDefaultToolButton
  );
  customElements.define('edgeless-connector-menu', EdgelessConnectorMenu);
  customElements.define('ai-panel-answer', AIPanelAnswer);
  customElements.define(
    'edgeless-eraser-tool-button',
    EdgelessEraserToolButton
  );
  customElements.define('edgeless-frame-menu', EdgelessFrameMenu);
  customElements.define('edgeless-frame-tool-button', EdgelessFrameToolButton);
  customElements.define('ai-panel-input', AIPanelInput);
  customElements.define('ai-panel-generating', AIPanelGenerating);
  customElements.define('edgeless-link-tool-button', EdgelessLinkToolButton);
  customElements.define('edgeless-mindmap-menu', EdgelessMindmapMenu);
  customElements.define('edgeless-lasso-tool-button', EdgelessLassoToolButton);
  customElements.define('ai-panel-error', AIPanelError);
  customElements.define(
    EDGELESS_SELECTED_RECT_WIDGET,
    EdgelessSelectedRectWidget
  );
  customElements.define('mindmap-import-placeholder', MindMapPlaceholder);
  customElements.define(
    'edgeless-note-senior-button',
    EdgelessNoteSeniorButton
  );
  customElements.define('edgeless-align-panel', EdgelessAlignPanel);
  customElements.define('card-style-panel', CardStylePanel);
  customElements.define('edgeless-color-button', EdgelessColorButton);
  customElements.define('edgeless-color-panel', EdgelessColorPanel);
  customElements.define('edgeless-text-color-icon', EdgelessTextColorIcon);
  customElements.define(
    'edgeless-mindmap-tool-button',
    EdgelessMindmapToolButton
  );
  customElements.define('edgeless-note-tool-button', EdgelessNoteToolButton);
  customElements.define('edgeless-note-menu', EdgelessNoteMenu);
  customElements.define('edgeless-line-width-panel', EdgelessLineWidthPanel);
  customElements.define(
    'edgeless-frame-order-button',
    EdgelessFrameOrderButton
  );
  customElements.define('edgeless-frame-order-menu', EdgelessFrameOrderMenu);
  customElements.define(
    'edgeless-auto-complete-panel',
    EdgelessAutoCompletePanel
  );
  customElements.define(
    'edgeless-navigator-setting-button',
    EdgelessNavigatorSettingButton
  );
  customElements.define('edgeless-present-button', EdgelessPresentButton);
  customElements.define('overlay-scrollbar', OverlayScrollbar);
  customElements.define('affine-template-loading', AffineTemplateLoading);
  customElements.define('edgeless-auto-complete', EdgelessAutoComplete);
  customElements.define(
    'edgeless-font-weight-and-style-panel',
    EdgelessFontWeightAndStylePanel
  );
  customElements.define('edgeless-note-shadow-panel', EdgelessNoteShadowPanel);
  customElements.define('edgeless-templates-panel', EdgelessTemplatePanel);
  customElements.define('edgeless-text-menu', EdgelessTextMenu);
  customElements.define('edgeless-template-button', EdgelessTemplateButton);
  customElements.define('edgeless-tool-icon-button', EdgelessToolIconButton);
  customElements.define('edgeless-size-panel', EdgelessSizePanel);
  customElements.define('edgeless-scale-panel', EdgelessScalePanel);
  customElements.define('edgeless-font-family-panel', EdgelessFontFamilyPanel);
  customElements.define('edgeless-shape-panel', EdgelessShapePanel);
  customElements.define('note-display-mode-panel', NoteDisplayModePanel);
  customElements.define('edgeless-toolbar-button', EdgelessToolbarButton);
  customElements.define('frame-preview', FramePreview);
  customElements.define('presentation-toolbar', PresentationToolbar);
  customElements.define('edgeless-shape-menu', EdgelessShapeMenu);
  customElements.define('stroke-style-panel', StrokeStylePanel);
  customElements.define('edgeless-shape-tool-button', EdgelessShapeToolButton);
  customElements.define(
    'edgeless-connector-label-editor',
    EdgelessConnectorLabelEditor
  );
  customElements.define(
    'edgeless-shape-tool-element',
    EdgelessShapeToolElement
  );
  customElements.define('edgeless-shape-text-editor', EdgelessShapeTextEditor);
  customElements.define(
    'edgeless-group-title-editor',
    EdgelessGroupTitleEditor
  );
  customElements.define(EDGELESS_TOOLBAR_WIDGET, EdgelessToolbarWidget);
  customElements.define('edgeless-shape-style-panel', EdgelessShapeStylePanel);
  customElements.define(
    'edgeless-frame-title-editor',
    EdgelessFrameTitleEditor
  );
  customElements.define('edgeless-text-editor', EdgelessTextEditor);
  customElements.define('affine-image-toolbar', AffineImageToolbar);
  customElements.define('edgeless-slide-menu', EdgelessSlideMenu);
  customElements.define(
    'edgeless-toolbar-shape-draggable',
    EdgelessToolbarShapeDraggable
  );
  customElements.define('toolbar-arrow-up-icon', ToolbarArrowUpIcon);

  customElements.define(AFFINE_AI_PANEL_WIDGET, AffineAIPanelWidget);
  customElements.define(AFFINE_EMBED_CARD_TOOLBAR_WIDGET, EmbedCardToolbar);
  customElements.define(AFFINE_INNER_MODAL_WIDGET, AffineInnerModalWidget);
  customElements.define(AFFINE_MODAL_WIDGET, AffineModalWidget);
  customElements.define(
    AFFINE_PAGE_DRAGGING_AREA_WIDGET,
    AffinePageDraggingAreaWidget
  );
  customElements.define(AFFINE_EDGELESS_COPILOT_WIDGET, EdgelessCopilotWidget);

  customElements.define(AFFINE_IMAGE_TOOLBAR_WIDGET, AffineImageToolbarWidget);
  customElements.define(AFFINE_SLASH_MENU_WIDGET, AffineSlashMenuWidget);
  customElements.define(
    AFFINE_VIEWPORT_OVERLAY_WIDGET,
    AffineViewportOverlayWidget
  );
  customElements.define(
    AFFINE_EDGELESS_ZOOM_TOOLBAR_WIDGET,
    AffineEdgelessZoomToolbarWidget
  );
  customElements.define(AFFINE_SURFACE_REF_TOOLBAR, AffineSurfaceRefToolbar);
  customElements.define(AFFINE_FORMAT_BAR_WIDGET, AffineFormatBarWidget);
}
