import { createMemo, createSignal, For, Show, type Component } from "solid-js";
import type { KikuConfig } from "#/src/lib/config";
import { defaultConfig } from "#/src/lib/default-config";
import { useConfigContext } from "#/src/contexts/ConfigContext";
import { Dot, InfoIcon, UndoIcon } from "./Icons";
import { useAnkiFieldContext } from "#/src/contexts/AnkiFieldsContext";

export type BoolConfigKey = {
  [K in keyof KikuConfig]: KikuConfig[K] extends boolean ? K : never;
}[keyof KikuConfig];

export type StringConfigKey = {
  [K in keyof KikuConfig]: KikuConfig[K] extends string ? K : never;
}[keyof KikuConfig];

export type NumberConfigKey = {
  [K in keyof KikuConfig]: KikuConfig[K] extends number ? K : never;
}[keyof KikuConfig];

export type NumStrConfigKey = StringConfigKey | NumberConfigKey;

export function SelectSetting<Key extends StringConfigKey, Value extends KikuConfig[Key]>(props: {
  configKey: Key;
  label: string;
  options: { value: Value; label: string; description?: string }[];
}) {
  const { $config, $setConfig } = useConfigContext();
  const $currentValue = createMemo(() => $config[props.configKey] as string);
  const $selectedOption = createMemo(() => props.options.find((o) => o.value === $currentValue()));

  return (
    <fieldset class="fieldset py-0">
      <legend class="fieldset-legend">{props.label}</legend>
      <select
        class="select w-full"
        on:change={(e) => {
          $setConfig(props.configKey, e.target.value as Value);
        }}
      >
        <For each={props.options}>
          {(option) => (
            <option value={option.value} selected={$currentValue() === option.value}>
              {option.label}
            </option>
          )}
        </For>
      </select>
      <Show when={$selectedOption()?.description}>
        {(desc) => <div class="fieldset-label text-xs opacity-70">{desc()}</div>}
      </Show>
    </fieldset>
  );
}

export function ToggleSetting(props: {
  configKey: BoolConfigKey;
  label: string;
  tooltip?: string;
}) {
  const { $config, $setConfig } = useConfigContext();
  return (
    <fieldset class="fieldset py-0">
      <legend class="fieldset-legend">
        {props.label}
        <Show when={props.tooltip}>
          <div class="tooltip before:max-w-32 sm:before:max-w-64" data-tip={props.tooltip}>
            <InfoIcon class="size-4 text-base-content-calm" />
          </div>
        </Show>
      </legend>
      <label class="label">
        <input
          type="checkbox"
          checked={$config[props.configKey] as boolean}
          class="toggle"
          on:change={(e) => {
            $setConfig(props.configKey, e.target.checked);
          }}
        />
      </label>
    </fieldset>
  );
}

export function UndoButton(props: { configKey: keyof KikuConfig }) {
  const { $config, $setConfig } = useConfigContext();
  return (
    <button
      on:click={() => {
        $setConfig(props.configKey, defaultConfig[props.configKey]);
      }}
      on:touchend={(e) => e.stopPropagation()}
    >
      <UndoIcon
        class="size-4 cursor-pointer"
        classList={{
          hidden: $config[props.configKey] === defaultConfig[props.configKey],
        }}
      />
    </button>
  );
}

export function TextSetting(props: { configKey: StringConfigKey; label: string }) {
  const { $config, $setConfig } = useConfigContext();
  return (
    <fieldset class="fieldset py-0">
      <legend class="fieldset-legend">
        {props.label}
        <UndoButton configKey={props.configKey} />
      </legend>
      <input
        type="text"
        class="input w-full"
        placeholder={defaultConfig[props.configKey] as string}
        value={$config[props.configKey] as string}
        on:keydown={(e) => e.stopPropagation()}
        on:input={(e) => {
          $setConfig(props.configKey, (e.target as HTMLInputElement).value);
        }}
      />
    </fieldset>
  );
}

export function RangeSetting(props: {
  configKey: NumStrConfigKey;
  label: string;
  values: readonly (string | number)[];
  labels?: readonly string[];
  showUndo?: boolean;
  Preview?: Component<{ value: string | number }>;
  rangeSize?: "xs" | "sm";
}) {
  const { $config, $setConfig } = useConfigContext();
  const $currentValue = createMemo<string | number>(() => $config[props.configKey]);
  const $currentIndex = createMemo(() => props.values.indexOf($currentValue()));
  const $displayLabels = createMemo(() => props.labels ?? (props.values as readonly string[]));
  const $size = createMemo(() => (props.rangeSize === "xs" ? "xs" : "sm"));

  function Input() {
    return (
      <input
        type="range"
        min="0"
        max={props.values.length - 1}
        value={$currentIndex()}
        class={`range w-full`}
        classList={{
          "range-sm": $size() === "sm",
          "range-xs": $size() === "xs",
        }}
        step="1"
        on:change={(e) => {
          const target = e.target as HTMLInputElement;
          $setConfig(props.configKey, props.values[Number(target.value)]);
        }}
      />
    );
  }

  return (
    <fieldset class="fieldset py-0">
      <legend class="fieldset-legend">
        {props.label}
        <Show when={props.showUndo}>
          <UndoButton configKey={props.configKey} />
        </Show>
      </legend>

      <Show when={props.Preview} fallback={<Input />}>
        {($Preview) => {
          const Preview = $Preview();
          return (
            <div class="tooltip">
              <div class="tooltip-content">
                <Preview value={$currentValue()} />
              </div>
              <Input />
            </div>
          );
        }}
      </Show>

      <div class="flex justify-between text-xs">
        <For each={$displayLabels()}>
          {(label) => (
            <div class="flex flex-col items-center">
              <Dot class="size-5 text-base-content-calm" />
              <span>{label}</span>
            </div>
          )}
        </For>
      </div>
    </fieldset>
  );
}

export function KeybindInput(props: { label: string; configKey: StringConfigKey }) {
  const { $config, $setConfig } = useConfigContext();
  const [$isRecording, $setIsRecording] = createSignal(false);

  const onKeyDown = (e: KeyboardEvent) => {
    if (!$isRecording()) return;
    e.preventDefault();
    $setConfig(props.configKey, e.key);
    $setIsRecording(false);
  };

  return (
    <fieldset class="fieldset">
      <legend class="fieldset-legend">
        {props.label} <UndoButton configKey={props.configKey} />
      </legend>
      <button
        type="button"
        class="btn btn-sm w-full font-mono"
        classList={{ "btn-primary": $isRecording() }}
        on:click={() => $setIsRecording(!$isRecording())}
        on:touchend={(e) => e.stopPropagation()}
        on:keydown={onKeyDown}
      >
        {$isRecording() ? "Press any key..." : ($config[props.configKey] as string)}
      </button>
    </fieldset>
  );
}

export function SessionCardTypeSelector() {
  const { $setAnkiFields, initialAnkiFields } = useAnkiFieldContext();
  const [$override, setOverride] = createSignal(
    sessionStorage.getItem("kiku-session-override") || "none"
  );

  const CARD_TYPES = [
    { id: "none", label: "None (Use Card's Default)" },
    { id: "Default", label: "Word" },
    { id: "IsWordAndSentenceCard", label: "Word & Sentence" },
    { id: "IsClickCard", label: "Click" },
    { id: "IsSentenceCard", label: "Sentence" },
    { id: "IsAudioCard", label: "Audio" },
  ] as const;

  const handleChange = (e: Event) => {
    const val = (e.target as HTMLSelectElement).value;
    
    // 1. Save to session storage for all upcoming cards
    setOverride(val);
    sessionStorage.setItem("kiku-session-override", val);

    // 2. Instantly update the current card you are looking at
    if (val === "none") {
      // Revert to whatever this specific card has in the database
      $setAnkiFields({
        IsWordAndSentenceCard: initialAnkiFields.IsWordAndSentenceCard || "",
        IsClickCard: initialAnkiFields.IsClickCard || "",
        IsSentenceCard: initialAnkiFields.IsSentenceCard || "",
        IsAudioCard: initialAnkiFields.IsAudioCard || "",
      });
    } else {
      // Apply the override directly to the current card
      $setAnkiFields({
        IsWordAndSentenceCard: val === "IsWordAndSentenceCard" ? "1" : "",
        IsClickCard: val === "IsClickCard" ? "1" : "",
        IsSentenceCard: val === "IsSentenceCard" ? "1" : "",
        IsAudioCard: val === "IsAudioCard" ? "1" : "",
      });
    }
  };

  return (
    <fieldset class="fieldset py-0">
      <legend class="fieldset-legend">Session Card Override</legend>
      <select
        class="select w-full"
        value={$override()}
        on:change={handleChange}
      >
        <For each={CARD_TYPES}>
          {(type) => <option value={type.id}>{type.label}</option>}
        </For>
      </select>
      <div class="fieldset-label text-xs opacity-70">
        Forces this layout for all cards. Resets when restarting Anki.
      </div>
    </fieldset>
  );
}