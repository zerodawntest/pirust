# Inventory: pi package `tui` (source `packages/tui/src`)

Format: `path | exports | purpose (≤10 words) | target crate`. All files target the Rust crate `pi-tui` (the port of this package). Exports from `rg -n "^export"`; `index.ts` is the public barrel.

## `src/` (root)

| path | exports | purpose | target crate |
|---|---|---|---|
| src/alt-screen-search.ts | AltScreenSearchSegment, AltScreenSearchMatch, AltScreenSearchResult, AltScreenSearchIndex, findAltScreenSearchMatches, getAltScreenSearchMatchKey, AltScreenSearchComponent | full-screen text search index and UI component | pi-tui |
| src/autocomplete.ts | AutocompleteItem, SlashCommand, AutocompleteSuggestions, AutocompleteProvider, CombinedAutocompleteProvider | slash-command and file autocomplete suggestions | pi-tui |
| src/colors.ts | IndexedColor, RgbColorValue, OklchColorValue, Color, TerminalColorMode, ColorMixSpace, OklchChannels, OkhslChannels, TextAttributes, TextStyle, indexedColor, rgbColor, oklchColor, okhslColor, colorToOkhsl, parseColor, colorToRgb, colorToOklch, colorToHex, mixColors, foregroundAnsi, backgroundAnsi, styleText, styleTextWithAnsi | ANSI/truecolor text styling and color conversions | pi-tui |
| src/editor-component.ts | EditorComponent | editor component interface contract | pi-tui |
| src/fuzzy.ts | FuzzyMatch, fuzzyMatch, fuzzyFilter | fuzzy string match and filter | pi-tui |
| src/index.ts | (re-exports) components, editor, fuzzy, keys, layout, latex, native, oklab, program-status, stdin-buffer, terminal, tui, ... | public API barrel re-exporting all modules | pi-tui |
| src/keybindings.ts | Keybindings, Keybinding, KeybindingDefinition, KeybindingDefinitions, KeybindingsConfig, TUI_KEYBINDINGS, KeybindingConflict, KeybindingsManager, setKeybindings, getKeybindings, getSelectPageIndex | keybinding definitions, manager, and lookup | pi-tui |
| src/keys.ts | setKittyProtocolActive, isKittyProtocolActive, KeyId, Key, KeyEventType, isKeyRelease, isKeyRepeat, matchesKey, parseKey, decodeKittyPrintable, decodePrintableKey | keyboard parsing and Kitty protocol keys | pi-tui |
| src/kill-ring.ts | KillRing | editor kill-ring for deleted text | pi-tui |
| src/latex.ts | RenderLatexOptions, renderLatex | LaTeX to Unicode/ANSI rendering | pi-tui |
| src/layout-node.ts | LAYOUT_NODE, LayoutViewport, StackLayoutEntry, StackLayoutNode, ScrollLayoutState, ScrollLayoutNode, LayoutNode, LayoutComponent, getLayoutNode | layout node tree types and symbol | pi-tui |
| src/layout.ts | LayoutRect, LayoutBox, LayoutFrame, ScrollbarGeometry, getScrollbarGeometry, renderLayoutFrame, getLayoutBoxesAt, getScrollViewBox, getScrollViewsAt | layout frames, boxes, and hit-testing | pi-tui |
| src/native-modifiers.ts | (re-export ModifierKey), isNativeModifierPressed | native modifier-key state query | pi-tui |
| src/native-module-path.ts | NativeModuleCandidateOptions, getNativeModuleCandidates | native module path candidate resolution | pi-tui |
| src/native-platform.ts | ModifierKey, NativeClipboard, getNativePlatformHelper, getNativeClipboard | native clipboard and platform helper access | pi-tui |
| src/oklab.ts | oklabToOkhslLightness, oklabToLinearSrgb, rgbToOklab, linearSrgbToRgb, okhslToRgb, rgbToOkhsl | OKLab/OKHSL color space conversions | pi-tui |
| src/program-status.ts | ProgramStatus, PROGRAM_STATUS_QUERY, isProgramStatusReply, formatProgramStatus | OSC 7501 program status query and format | pi-tui |
| src/stdin-buffer.ts | StdinBufferOptions, StdinBufferEventMap, StdinBuffer | buffered stdin input events | pi-tui |
| src/terminal-colors.ts | RgbColor, TerminalColorScheme, TerminalColors, OscColorTarget, parseOscColorResponse, parseTerminalColorSchemeReport | terminal color scheme detection via OSC | pi-tui |
| src/terminal-image.ts | ImageProtocol, TerminalCapabilities, CellDimensions, ImageDimensions, ImageRenderOptions, getCellDimensions, setCellDimensions, detectCapabilities, getCapabilities, getTerminalColorMode, resetCapabilitiesCache, setCapabilityOverrides, setCapabilities, isImageLine, ImageLineExtent, getImageLineExtent, stripImageSequences, allocateImageId, encodeKitty, deleteKittyImage, deleteAllKittyImages, deleteAllKittyPlacements, encodeITerm2, ImageCellSize, KittyImageMetadata, KittyImagePlacement, registerKittyImageMetadata, getMaxKittyImageRows, getKittyImageMetadata, getKittyImagePlacementRows, getKittyImagePlacement, cropKittyImageLine, calculateImageCellSize, calculateImageRows, getPngDimensions, getJpegDimensions, getGifDimensions, getWebpDimensions, getImageDimensions, renderImage, hyperlink, imageFallback | inline images: Kitty/iTerm2 encode, detect, size | pi-tui |
| src/terminal.ts | KeyboardProtocolNegotiationSequence, parseKeyboardProtocolNegotiationSequence, isAppleTerminalSession, refreshTerminalDimensions, normalizeNativeShiftEnterInput, normalizeAppleTerminalInput, Terminal, resolveEscapeTimeoutMs, ProcessTerminal | process terminal I/O and Apple Terminal handling | pi-tui |
| src/tui-alt-screen.ts | TuiAltScreenOptions, TuiAltScreen | alternate-screen TUI (ViewportTUI) | pi-tui |
| src/tui-main-screen.ts | TuiMainScreenRenderState, TuiMainScreen | main-screen TUI renderer | pi-tui |
| src/tui.ts | TuiMouseEventType, TuiMouseButton, TuiMouseEvent, TuiMouseEventResult, TuiMouseDispatchTarget, TuiMouseDispatchResult, dispatchMouseEvent, retargetMouseEvent, Component, TuiInputListenerResult, TuiInputListener, Focusable, isFocusable, CURSOR_MARKER, FAKE_CURSOR_START, FAKE_CURSOR_END, renderFakeCursor, visibleWidth, OverlayAnchor, OverlayMargin, SizeValue, OverlayOptions, OverlayUnfocusOptions, OverlayBounds, OverlayHandle, Container, compositeTuiLine, TuiMode, TuiStopOptions, TUI, VIEWPORT_TUI, ViewportTUI, isViewportTUI, TuiBase | core TUI: components, container, focus, mouse, overlays | pi-tui |
| src/undo-stack.ts | UndoStack | generic undo stack | pi-tui |
| src/utils.ts | getGraphemeSegmenter, getWordSegmenter, cjkBreakRegex, cjkPunctuationRegex, autocompleteSeparatorRegex, autocompleteBoundaryRegex, visibleWidth, stripTerminalSequences, replaceControlCharacters, getGraphemeCellRange, getOsc8LinkAtColumn, normalizeTerminalOutput, extractAnsiCode, getActiveBackgroundAnsi, flattenLines, wrapTextWithAnsi, PUNCTUATION_REGEX, isWhitespaceChar, isPunctuationChar, applyBackgroundToLine, truncateToWidth, sliceByColumn, sliceWithWidth, extractSegments | text width, wrapping, and ANSI slicing utilities | pi-tui |
| src/wheel-scroll.ts | WheelScrollLines, WheelScrollAccelerator | mouse wheel scroll acceleration | pi-tui |
| src/word-navigation.ts | WordNavigationOptions, findWordBackward, findWordForward | word-wise cursor navigation | pi-tui |

## `src/components/`

| path | exports | purpose | target crate |
|---|---|---|---|
| src/components/alt-screen-flash.ts | AltScreenFlashContainer | flash overlay container for alt screen | pi-tui |
| src/components/box.ts | Box | bordered box container component | pi-tui |
| src/components/cancellable-loader.ts | CancellableLoader | loader with cancel affordance | pi-tui |
| src/components/editor.ts | TextChunk, wordWrapLine, EditorTheme, EditorOptions, Editor | text editor component and word wrapping | pi-tui |
| src/components/h-stack.ts | HStack | horizontal stack layout | pi-tui |
| src/components/image.ts | ImageTranscoder, setImageTranscoder, ImageTheme, ImageOptions, Image | inline image display component | pi-tui |
| src/components/input.ts | InputOptions, Input | single-line text input widget | pi-tui |
| src/components/loader.ts | LoaderIndicatorOptions, Loader | spinner loading indicator | pi-tui |
| src/components/markdown.ts | DefaultTextStyle, MarkdownTheme, MarkdownOptions, Markdown | markdown rendering component | pi-tui |
| src/components/mouse-region.ts | MouseRegionHandler, MouseRegion | mouse event capture region | pi-tui |
| src/components/scroll-view.ts | ScrollViewScrollbar, ScrollViewOptions, ScrollViewScrollToOptions, ScrollView | scrollable view container | pi-tui |
| src/components/select-list.ts | SelectItem, SelectListTheme, SelectListTruncatePrimaryContext, SelectListLayoutOptions, SelectList | selectable list UI | pi-tui |
| src/components/settings-list.ts | SettingItem, SettingsListTheme, SettingsListOptions, SettingsList | settings list UI | pi-tui |
| src/components/spacer.ts | Spacer | blank spacer component | pi-tui |
| src/components/stack.ts | StackEntryOptions, StackEntry, StackChild, StackOptions, Stack, visibleStackEntries, allocateStackSizes | stack layout base and size allocation | pi-tui |
| src/components/text.ts | Text | static text component | pi-tui |
| src/components/truncated-text.ts | TruncatedText | truncating text component | pi-tui |
| src/components/v-stack.ts | VStack, (re-exports StackChild, StackEntry, StackEntryOptions, StackOptions) | vertical stack layout | pi-tui |
