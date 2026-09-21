import {
  createEffect,
  createMemo,
  createResource,
  createSignal,
  ErrorBoundary,
  on,
  onCleanup,
  onMount,
  Show,
  Suspense,
  type JSX,
} from "solid-js";
import { Portal } from "solid-js/web";
import { AnkiConnect } from "#/src/lib/anki-connect";
import {
  getCssVar,
  type RootDatasetKey,
  rootDatasetConfigWhitelist,
  type TailwindSize,
  tailwindContainerSize,
  tailwindFontSizeVar,
  tailwindSize,
  getCssVarDark,
  generateCssVars,
  generateCssVarsDark,
} from "#/src/lib/config";
import { constants } from "#/src/lib/contants";
import { useNavigationTransition, useThemeTransition } from "#/src/hooks/transition";
import { capitalize } from "#/src/lib/text";
import { daisyUIThemes, type DaisyUITheme } from "#/src/lib/theme";
import { useAnkiFieldContext } from "#/src/contexts/AnkiFieldsContext";
import { useConfigContext } from "#/src/contexts/ConfigContext";
import { useCtxContext } from "#/src/contexts/CtxContext";
import { useGeneralContext } from "#/src/contexts/GeneralContext";
import { HeaderSettings } from "./HeaderSettings";
import { ClipboardCopyIcon, InfoIcon, RefreshCwIcon, UndoIcon } from "./Icons";
import { useCardContext } from "#/src/contexts/CardContext";
import {
  ToggleSetting,
  TextSetting,
  RangeSetting,
  SelectSetting,
  KeybindInput,
  SessionCardTypeSelector,
  type NumStrConfigKey,
} from "./SettingsForm";
import { getTemplatePreview } from "#/src/lazy/lib/template";

function toDashed(str: string) {
  return str.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
}

function toDatasetKey(str: string) {
  return `data-${str}`;
}

function toDatasetString(obj: Record<string, string | number | boolean>) {
  return Object.entries(obj)
    .map(([key, value]) => {
      const dashed = toDashed(key);
      return `${toDatasetKey(dashed)}="${value}"`;
    })
    .join("\n");
}

export function Settings() {
  const { $config } = useConfigContext();
  const { $general, logger, isAnkiDesktop, isAnkiWeb, $checkAnkiConnect, $$ankiConnect } =
    useGeneralContext();
  const { navigateBack } = useNavigationTransition();
  const $ready = createMemo(() => $$ankiConnect.state === "ready");

  const saveConfig = async () => {
    try {
      logger.debug("Saving config:", $config);
      await AnkiConnect.saveConfig($config);
      $general.toast.success("Saved! Restart Anki to apply changes.");
    } catch (e) {
      $general.toast.error(`Failed to save config: ${e instanceof Error ? e.message : ""}`);
    }
  };

  const ctx = useCtxContext();
  onMount(() => {
    try {
      $general.plugin?.onSettingsMount?.({ ctx });
    } catch (e) {
      logger.warn("[Settings] plugin onSettingsMount failed:", e);
    }
  });

  onMount(() => {
    if (isAnkiDesktop) void $checkAnkiConnect();
  });

  return (
    <>
      <HeaderSettings />
      <div class="sm:pb-14">
        <GeneralSettings />
        <div class="divider"></div>
        <RelatedExpressionSettings />
        <div class="divider"></div>
        <DefinitionSettings />
        <div class="divider"></div>
        <ModSettings />
        <div class="divider"></div>
        <ThemeSettings />
        <div class="divider"></div>
        <FontSettings />
        <div class="divider"></div>
        <FontSizeSettings />
        <div class="divider"></div>
        <AnkiDroidSettings />
        <div class="divider"></div>
        <KeybindSettings />
        <div class="divider"></div>
        <DebugSettings />
        <Portal mount={$general.layoutRef}>
          <div
            class="bottom-0 w-full pointer-events-none"
            classList={{
              fixed: !isAnkiWeb,
              absolute: isAnkiWeb,
            }}
          >
            <div class="mx-auto w-full relative layout-max-width">
              <div class="flex flex-row gap-2 justify-end animate-fade-in pb-4 px-2 sm:px-4">
                <button
                  class="btn pointer-events-auto"
                  on:click={() => navigateBack()}
                  on:touchend={(e) => e.stopPropagation()}
                >
                  Back
                </button>
                <button
                  class="btn pointer-events-auto"
                  classList={{
                    "btn-primary": $ready(),
                    "btn-disabled bg-base-300 text-base-content-faint": !$ready(),
                  }}
                  disabled={!$ready()}
                  on:click={saveConfig}
                  on:touchend={(e) => e.stopPropagation()}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </Portal>
      </div>
    </>
  );
}

function KikuIcon() {
  const [$$latestVersion] = createResource(async () => {
    const cached = sessionStorage.getItem(constants.key["kiku-latest-version"]);
    if (cached) return cached;

    const checked = sessionStorage.getItem(constants.key["kiku-latest-version-checked"]);
    if (checked) return null;
    sessionStorage.setItem(constants.key["kiku-latest-version-checked"], "true");

    const res = await fetch("https://api.github.com/repos/youyoumu/kiku/releases/latest");
    if (!res.ok) return null;
    const data = await res.json();
    const tag_name = data?.tag_name;
    const version = tag_name?.replace(/^v/, "");
    if (!version) return null;
    sessionStorage.setItem(constants.key["kiku-latest-version"], version);
    return version;
  });

  return (
    <div class="flex flex-col items-center text-base-content-faint justify-center">
      <div class="text-base-content-subtle-200 text-6xl">菊</div>
      <div class="flex items-center gap-1.5">
        <KikuVersion latestVersion={$$latestVersion.state === "ready" ? $$latestVersion() : null} />
      </div>
    </div>
  );
}

function KikuVersion(props: { latestVersion?: string | null }) {
  const $version = createMemo(() =>
    props.latestVersion && props.latestVersion !== constants.VERSION ? props.latestVersion : null,
  );
  return (
    <>
      <div
        classList={{ tooltip: !!$version() }}
        class="tooltip-bottom tooltip-info flex gap-2 items-center"
        data-tip={$version() ? `Update Available: v${$version()}` : undefined}
      >
        <a
          href="https://github.com/youyoumu/kiku/releases/latest"
          target="_blank"
          rel="noreferrer"
          class="text-sm"
        >
          Kiku Note v{constants.VERSION}
        </a>
        <a
          href={`https://github.com/youyoumu/kiku/commit/${constants.COMMIT_SHA}`}
          target="_blank"
          rel="noreferrer"
          class="text-xs"
        >
          ({constants.COMMIT_SHA.slice(0, 7)})
        </a>
      </div>
      <Show when={$version()}>
        <span class="status status-info"></span>
      </Show>
    </>
  );
}

function Section(props: { children: JSX.Element }) {
  return <div class="flex flex-col gap-2 sm:gap-4 animate-fade-in relative">{props.children}</div>;
}

function SectionTitle(props: { children: JSX.Element }) {
  return <div class="text-2xl font-bold">{props.children}</div>;
}

function GeneralSettings() {
  const { $isConfigOutOfSync } = useConfigContext();
  const [$showOutOfSync, $setShowOutOfSync] = createSignal(false);

  createEffect(() => {
    const isOutOfSync = $isConfigOutOfSync();
    setTimeout(() => {
      $setShowOutOfSync(isOutOfSync);
    }, 1000);
  });

  return (
    <Section>
      <KikuIcon />

      <Show when={$showOutOfSync()}>
        <div role="alert" class="alert alert-warning">
          <span>
            The card template is out of sync with your current theme or display settings. Until you
            click Save and restart Anki, there might be a flash of the wrong theme.
          </span>
        </div>
      </Show>
      <SectionTitle>General</SectionTitle>
      <div class="grid grid-cols-[repeat(auto-fit,minmax(10rem,1fr))] sm:grid-cols-[repeat(auto-fit,minmax(20rem,1fr))] rounded-box gap-2 sm:gap-4">
        
        <SessionCardTypeSelector/>
        
        <ToggleSetting configKey="blurNsfw" label="Blur NSFW" />
        <ToggleSetting configKey="pictureOnFront" label="Picture on Front" />
        <ToggleSetting
          configKey="muteNsfw"
          label="Mute NSFW"
          tooltip="Prevent SentenceAudio from playing on NSFW cards. Does not work with AnkiDroid old study screen"
        />
        <ToggleSetting
          configKey="swapSentenceAndDefinitionOnMobile"
          label="Mobile Layout Alt"
          tooltip="Swap Sentence and Definition position on mobile"
        />
        <ToggleSetting
          configKey="preferAnkiConnect"
          label="Prefer AnkiConnect"
          tooltip="Query notes via AnkiConnect instead of the notes cache (Desktop only). May be slower and cause Anki to lag under heavy queries"
        />
        <RangeSetting
          configKey="layoutMaxWidth"
          label="Layout Max Width"
          values={tailwindContainerSize}
        />
      </div>
    </Section>
  );
}

function RelatedExpressionSettings() {
  return (
    <Section>
      <SectionTitle>Related Expression</SectionTitle>
      <div class="grid grid-cols-[repeat(auto-fit,minmax(20rem,1fr))] rounded-box gap-2 sm:gap-4">
        <ToggleSetting
          configKey="relatedExpressionExcludeNewCards"
          label="Exclude New Cards"
          tooltip="Exclude new (unstudied) cards from related expression results"
        />
        <ToggleSetting
          configKey="relatedExpressionFallback"
          label="Fallback"
          tooltip="When disabled, only show explicitly related expressions without fallback to same expression, reading, forms, antonym, or referenced"
        />
      </div>
    </Section>
  );
}

function DefinitionSettings() {
  return (
    <Section>
      <SectionTitle>Definition</SectionTitle>
      <div class="grid grid-cols-[repeat(auto-fit,minmax(20rem,1fr))] rounded-box gap-2 sm:gap-4">
        <SelectSetting
          configKey="definitionStyle"
          label="Style"
          options={[
            {
              value: "normal",
              label: "Normal (3 Pages)",
              description: "Shows Selection, Main Definition, and Glossary as separate pages.",
            },
            {
              value: "single-page",
              label: "Single Page (Appended)",
              description: "Appends all definitions into a single scrollable page.",
            },
            {
              value: "glossary-split",
              label: "Glossary Split (Per Dictionary)",
              description:
                "Splits the glossary into individual pages for each dictionary. Only works with Yomitan format",
            },
          ]}
        />
        <ToggleSetting
          configKey="definitionPictureFromGlossary"
          label="Collect Glossary Images"
          tooltip="Show images extracted from the glossary in the definition picture section."
        />
      </div>
    </Section>
  );
}

function ModSettings() {
  return (
    <Section>
      <SectionTitle>Mod</SectionTitle>
      <div>
        <div class="text-lg font-bold flex gap-2 items-center">
          Hidden
          <div class="tooltip" data-tip="Expression fade out after timeout">
            <InfoIcon class="size-4 text-base-content-calm" />
          </div>
        </div>
        <div class="grid grid-cols-[repeat(auto-fit,minmax(20rem,1fr))] rounded-box gap-2 sm:gap-4">
          <ToggleSetting configKey="modHidden" label="Enable" />
          <RangeSetting
            configKey="modHiddenDuration"
            label="Timeout"
            values={[1000, 2000, 3000, 4000, 5000]}
            labels={["1s", "2s", "3s", "4s", "5s"]}
          />
        </div>
      </div>
      <div>
        <div class="text-lg font-bold flex gap-2 items-center">
          Vertical
          <div class="tooltip" data-tip="Expression appears in the vertical direction">
            <InfoIcon class="size-4 text-base-content-calm" />
          </div>
        </div>
        <div class="grid grid-cols-[repeat(auto-fit,minmax(20rem,1fr))] rounded-box gap-2 sm:gap-4">
          <ToggleSetting configKey="modVertical" label="Enable" />
        </div>
      </div>
    </Section>
  );
}

function ThemeSettings() {
  const { $config } = useConfigContext();
  const { initialDarkMode } = useGeneralContext();
  const { $changeTheme } = useThemeTransition();
  const [$darkMode, $setDarkMode] = createSignal(initialDarkMode);
  const [$hasModified, $setHasModified] = createSignal(false);

  createEffect(
    on(
      $darkMode,
      (darkMode) => {
        const body = document.body;
        if (darkMode) body.classList.add("nightMode");
        else body.classList.remove("nightMode");
        $setHasModified(true);
      },
      { defer: true },
    ),
  );

  onCleanup(() => {
    if ($hasModified()) {
      const body = document.body;
      if (initialDarkMode) body.classList.add("nightMode");
      else body.classList.remove("nightMode");
    }
  });

  return (
    <Section>
      <div class="flex gap-x-4 sm:gap-x-2 gap-y-1 items-center flex-wrap">
        <SectionTitle>Theme</SectionTitle>
        <div role="tablist" class="tabs tabs-sm sm:tabs-md tabs-box self-start flex-nowrap">
          <button
            role="tab"
            class="tab"
            classList={{ "tab-active": !$darkMode() }}
            on:click={() => $setDarkMode(false)}
            on:touchend={(e) => e.stopPropagation()}
          >
            Light
          </button>
          <button
            role="tab"
            class="tab"
            classList={{ "tab-active": $darkMode() }}
            on:click={() => $setDarkMode(true)}
            on:touchend={(e) => e.stopPropagation()}
          >
            Dark
          </button>
        </div>
        <Show when={$hasModified() && $darkMode() !== initialDarkMode}>
          <div class="text-xs text-base-content-faint flex items-center gap-2">
            <span>{$darkMode() ? "Dark" : "Light"} theme has been emulated</span>
            <button
              class="text-base-content-soft"
              on:click={() => $setDarkMode(initialDarkMode)}
              on:touchend={(e) => e.stopPropagation()}
            >
              <UndoIcon class="size-4 cursor-pointer" />
            </button>
          </div>
        </Show>
      </div>

      <div class="grid grid-cols-[repeat(auto-fit,minmax(20rem,1fr))] rounded-box gap-2 sm:gap-4 pb-2 sm:pb-0">
        <ToggleSetting configKey="showTheme" label="Show Theme" />
      </div>

      <ThemeGrid
        selected={$darkMode() ? $config.themeDark : $config.theme}
        onSelect={(theme) => {
          $changeTheme(theme, $darkMode() ? "dark" : "light");
        }}
      />
    </Section>
  );
}

function ThemeGrid(props: { selected: DaisyUITheme; onSelect: (theme: DaisyUITheme) => void }) {
  return (
    <div class="grid grid-cols-[repeat(auto-fit,minmax(9rem,1fr))] rounded-box gap-2 sm:gap-4">
      {daisyUIThemes.map((theme, i) => {
        const even = i % 2 === 0;
        return (
          <div
            class="border-base-content/20 hover:border-base-content/40 overflow-hidden rounded-lg border outline-2 outline-offset-2 tappable"
            classList={{
              "outline-2": theme === props.selected,
            }}
            on:click={() => props.onSelect(theme)}
            on:touchend={(e) => e.stopPropagation()}
          >
            <div class="bg-base-100 w-full cursor-pointer">
              <div
                class="grid grid-cols-5 grid-rows-3 text-base-content"
                data-theme-preview={theme}
              >
                <div class="bg-base-200 col-start-1 row-span-2 row-start-1"></div>
                <div class="bg-base-300 col-start-1 row-start-3"></div>
                <div class="bg-base-100 col-span-4 col-start-2 row-span-3 row-start-1 flex flex-col gap-1 p-2">
                  <div class="font-bold">{capitalize(theme)}</div>
                  <div class="flex flex-wrap gap-1">
                    <div class="bg-primary flex aspect-square w-5 items-center justify-center rounded">
                      <div class="text-primary-content text-sm font-bold">{even ? "J" : "R"}</div>
                    </div>
                    <div class="bg-secondary flex aspect-square w-5 items-center justify-center rounded">
                      <div class="text-secondary-content text-sm font-bold">{even ? "U" : "E"}</div>
                    </div>
                    <div class="bg-accent flex aspect-square w-5 items-center justify-center rounded">
                      <div class="text-accent-content text-sm font-bold">{even ? "S" : "A"}</div>
                    </div>
                    <div class="bg-neutral flex aspect-square w-5 items-center justify-center rounded">
                      <div class="text-neutral-content text-sm font-bold">{even ? "T" : "D"}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function FontSettings() {
  return (
    <Section>
      <SectionTitle>Font</SectionTitle>
      <div class="grid grid-cols-[repeat(auto-fit,minmax(15rem,1fr))] rounded-box gap-4">
        <TextSetting configKey="systemFontPrimary" label="Primary" />
      </div>

      <div class="grid grid-cols-[repeat(auto-fit,minmax(15rem,1fr))] rounded-box gap-4">
        <TextSetting configKey="systemFontSecondary" label="Secondary" />
      </div>
    </Section>
  );
}

function FontSizeSettings() {
  return (
    <Section>
      <div class="collapse rounded-none gap-4 collapse-arrow">
        <input type="checkbox" />
        <div class="collapse-title p-0">
          <SectionTitle>Font Size</SectionTitle>
        </div>
        <div class="collapse-content p-0 flex flex-col gap-4">
          <div>
            <div class="text-lg font-bold">Mobile</div>
            <div class="grid grid-cols-[repeat(auto-fit,minmax(20rem,1fr))] rounded-box gap-x-4 gap-y-4 sm:gap-y-2">
              <FontSizeRangeSetting configKey="fontSizeBaseExpression" label="Expression" />
              <FontSizeRangeSetting configKey="fontSizeBasePitch" label="Pitch" />
              <FontSizeRangeSetting configKey="fontSizeBaseSentence" label="Sentence" />
              <FontSizeRangeSetting configKey="fontSizeBaseMiscInfo" label="Misc Info" />
              <FontSizeRangeSetting configKey="fontSizeBaseHint" label="Hint" />
            </div>
          </div>
          <div>
            <div class="text-lg font-bold">Desktop</div>
            <div class="grid grid-cols-[repeat(auto-fit,minmax(20rem,1fr))] rounded-box gap-x-4 gap-y-4 sm:gap-y-2">
              <FontSizeRangeSetting configKey="fontSizeSmExpression" label="Expression" />
              <FontSizeRangeSetting configKey="fontSizeSmPitch" label="Pitch" />
              <FontSizeRangeSetting configKey="fontSizeSmSentence" label="Sentence" />
              <FontSizeRangeSetting configKey="fontSizeSmMiscInfo" label="Misc Info" />
              <FontSizeRangeSetting configKey="fontSizeSmHint" label="Hint" />
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}

function FontSizeRangeSetting(props: { configKey: NumStrConfigKey; label: string }) {
  return (
    <RangeSetting
      configKey={props.configKey}
      label={props.label}
      values={tailwindSize}
      showUndo
      rangeSize="xs"
      Preview={(props) => {
        const $value = createMemo(() => props.value as TailwindSize);
        return (
          <div
            class="font-secondary"
            style={{
              "font-size": tailwindFontSizeVar[$value()].fontSize,
              "line-height": tailwindFontSizeVar[$value()].lineHeight,
            }}
          >
            あ
          </div>
        );
      }}
    />
  );
}

function ClipboardCopyButton(props: { text: string | (() => string) }) {
  const { $general, isAnkiDesktop } = useGeneralContext();

  function copyToClipboard() {
    const text = typeof props.text === "function" ? props.text() : props.text;
    navigator.clipboard
      .writeText(text)
      .then(() => {
        $general.toast.success("Copied to clipboard!");
      })
      .catch(() => {
        $general.toast.error(
          "Copy to clipboard is not supported, you can select and CTRL+C manually.",
        );
      });
  }

  return (
    <button
      on:click={copyToClipboard}
      on:touchend={(e) => e.stopPropagation()}
      classList={{
        hidden: isAnkiDesktop,
      }}
    >
      <ClipboardCopyIcon class="size-4 text-base-content-calm cursor-pointer" />
    </button>
  );
}

function AnkiDroidSettings() {
  const { isAnkiDroidNewStudyScreen } = useGeneralContext();

  return (
    <Section>
      <SectionTitle>AnkiDroid</SectionTitle>
      <Show when={isAnkiDroidNewStudyScreen}>
        <div role="alert" class="alert alert-warning">
          AnkiDroid integration is not available on AnkiDroid new study screen yet.
        </div>
      </Show>
      <div>
        <div class="grid grid-cols-[repeat(auto-fit,minmax(10rem,1fr))] rounded-box gap-x-4 gap-y-2">
          <ToggleSetting configKey="ankiDroidEnableIntegration" label="Enable Integration" />
          <ToggleSetting
            configKey="ankiDroidReverseSwipeDirection"
            label="Reverse Swipe Direction"
          />
        </div>
      </div>
    </Section>
  );
}

function KeybindSettings() {
  return (
    <Section>
      <SectionTitle>Keybind</SectionTitle>
      <div class="grid grid-cols-[repeat(auto-fit,minmax(20rem,1fr))] rounded-box gap-2 sm:gap-4">
        <div>
          <div class="text-lg font-bold">Definition Page</div>
          <div class="grid grid-cols-2 gap-2 sm:gap-4">
            <KeybindInput label="Previous" configKey="keybindDefinitionPrev" />
            <KeybindInput label="Next" configKey="keybindDefinitionNext" />
          </div>
        </div>
        <div>
          <div class="text-lg font-bold">Field Group</div>
          <div class="grid grid-cols-2 gap-2 sm:gap-4">
            <KeybindInput label="Previous" configKey="keybindFieldGroupPrev" />
            <KeybindInput label="Next" configKey="keybindFieldGroupNext" />
          </div>
        </div>
      </div>
    </Section>
  );
}

function DebugSettings() {
  const { $config } = useConfigContext();
  const { initialAnkiFields } = useAnkiFieldContext();
  const { logger } = useGeneralContext();
  const { $initialSide } = useCardContext();

  const [$logs, $setLogs] = createSignal<string>();
  onMount(() => {
    const id = setInterval(() => {
      $setLogs(logger.get());
    }, 8000);
    onCleanup(() => {
      clearInterval(id);
    });
    $setLogs(logger.get());
  });

  const $rootDataset = createMemo(() => {
    return Object.fromEntries(
      Object.entries($config).filter(([key]) => {
        return rootDatasetConfigWhitelist.has(key as RootDatasetKey);
      }),
    );
  });

  const $expectedCssVar = createMemo(() => {
    const cssVar = getCssVar($config);
    const cssVarDark = getCssVarDark($config);
    const cssVarTemplate = generateCssVars(cssVar);
    const cssVarDarkTemplate = generateCssVarsDark(cssVarDark);
    return `${cssVarTemplate}\n\n${cssVarDarkTemplate}`;
  });

  const $expectedTemplate = createMemo(() => {
    const dataset = $rootDataset();
    return getTemplatePreview({
      side: $initialSide(),
      theme: dataset.theme?.toString() ?? "",
      themeDark: dataset.themeDark?.toString() ?? "",
      blurNsfw: dataset.blurNsfw?.toString() ?? "",
      pictureOnFront: dataset.pictureOnFront?.toString() ?? "",
      modVertical: dataset.modVertical?.toString() ?? "",
    });
  });

  return (
    <div class="collapse rounded-none collapse-arrow">
      <input type="checkbox" />
      <div class="collapse-title p-0">
        <SectionTitle>Debug</SectionTitle>
      </div>
      <div class="collapse-content p-0">
        <div class="flex flex-col gap-4 animate-fade-in ">
          <div class="grid grid-cols-[repeat(auto-fit,minmax(10rem,1fr))] rounded-box gap-x-4 gap-y-2">
            <TextSetting configKey="ankiConnectAddress" label="AnkiConnect Address" />
            <ToggleSetting configKey="showStartupTime" label="Show Startup Time" />
          </div>
          <div class="flex flex-col gap-2">
            <div class="flex gap-2 items-center">
              <div class="text-lg">Expected Template</div>
              <ClipboardCopyButton text={() => $expectedTemplate()} />
            </div>
            <pre class="text-xs bg-base-200 p-4 rounded-lg overflow-auto">
              {$expectedTemplate()}
            </pre>
          </div>

          <div class="flex flex-col gap-2">
            <div class="flex gap-2 items-center">
              <div class="text-lg">Expected CSS Variables</div>
              <ClipboardCopyButton text={() => $expectedCssVar()} />
            </div>
            <pre class="text-xs bg-base-200 p-4 rounded-lg overflow-auto">{$expectedCssVar()}</pre>
          </div>

          <div class="flex flex-col gap-2">
            <div class="flex gap-2 items-center">
              <div class="text-lg">Config</div>
              <ClipboardCopyButton text={() => JSON.stringify({ ...$config }, null, 2)} />
            </div>
            <pre class="text-xs bg-base-200 p-4 rounded-lg overflow-auto">
              {JSON.stringify({ ...$config }, null, 2)}
            </pre>
          </div>

          <div class="flex flex-col gap-2">
            <div class="flex gap-2 items-center">
              <div class="text-lg">Anki Fields</div>
              <ClipboardCopyButton text={() => JSON.stringify(initialAnkiFields, null, 2)} />
            </div>

            <Show when={$initialSide() === "front"}>
              <div role="alert" class="alert alert-warning">
                Switch to back side for full Anki Fields
              </div>
            </Show>
            <pre class="text-xs bg-base-200 p-4 rounded-lg overflow-auto">
              {JSON.stringify(initialAnkiFields, null, 2)}
            </pre>
          </div>
          <KikuFiles />
          <div class="flex flex-col gap-2">
            <div class="flex gap-2 items-center">
              <div class="text-lg">Logs</div>
              <ClipboardCopyButton text={() => $logs() ?? ""} />

              <button
                on:click={() => {
                  $setLogs(logger.get());
                }}
                on:touchend={(e) => e.stopPropagation()}
              >
                <RefreshCwIcon class="size-4 text-base-content-calm cursor-pointer" />
              </button>
            </div>
            <pre class="text-xs bg-base-200 p-4 rounded-lg overflow-auto max-h-[90svh]">
              {$logs()}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}

function KikuFiles() {
  return (
    <ErrorBoundary fallback={null}>
      <Suspense fallback={null}>
        <$KikuFiles />
      </Suspense>
    </ErrorBoundary>
  );
}

function $KikuFiles() {
  const { $$ankiConnect } = useGeneralContext();
  const $ready = createMemo(() => $$ankiConnect.state === "ready");

  const [$$kikuResource] = createResource(
    () => $ready(),
    async () => {
      await new Promise((resolve) => setTimeout(resolve, 10000));
      const files = await AnkiConnect.getKikuFiles();
      const missing = constants.IMPORTANT_FILES.filter((file) => !files.includes(file));
      return {
        files: JSON.stringify(files, null, 2),
        missing: missing.join(", "),
      };
    },
  );

  return (
    <Show when={$$kikuResource()}>
      {(value) => {
        const { files, missing } = value();
        return (
          <div class="flex flex-col gap-2">
            <div class="flex gap-2 items-center">
              <div class="text-lg">Kiku Files</div>
              <ClipboardCopyButton text={() => files ?? ""} />
            </div>

            <Show when={missing}>
              <div role="alert" class="alert alert-warning">
                <span>
                  Some files are missing, things may not work as expected.
                  <br />
                  <span class="text-xs ">{missing}</span>
                </span>
              </div>
            </Show>
            <pre class="text-xs bg-base-200 p-4 rounded-lg overflow-auto">{files}</pre>
          </div>
        );
      }}
    </Show>
  );
}
