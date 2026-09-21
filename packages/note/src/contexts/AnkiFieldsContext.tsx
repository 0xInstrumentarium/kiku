import { type Accessor, createContext, createMemo, useContext } from "solid-js";
import type { JSX } from "solid-js/jsx-runtime";
import { createStore, type SetStoreFunction, type Store } from "solid-js/store";
import type { AnkiFields } from "#/src/lib/types";

const AnkiFieldsContext = createContext<{
  $ankiFields: Store<AnkiFields>;
  $setAnkiFields: SetStoreFunction<AnkiFields>;
  $isRootAnkiFields: Accessor<boolean>;
  $isInitialAnkiFields: Accessor<boolean>;
  $isRootInitialAnkiFields: Accessor<boolean>;
  noteId?: number;
  initialAnkiFields: AnkiFields;
  resetAnkiFields: () => void;
}>();

export function AnkiFieldContextProvider(props: {
  children: JSX.Element;
  initialAnkiFields: AnkiFields;
  noteId?: number;
  isRoot?: boolean;
}) {
  // 1. Check for a global session override
  const override = sessionStorage.getItem("kiku-session-override");
  const modifiedFields = { ...props.initialAnkiFields };

  // 2. If an override is set, force the fields for this card
  if (override && override !== "none") {
    modifiedFields.IsWordAndSentenceCard = "";
    modifiedFields.IsClickCard = "";
    modifiedFields.IsSentenceCard = "";
    modifiedFields.IsAudioCard = "";

    if (override === "IsWordAndSentenceCard") modifiedFields.IsWordAndSentenceCard = "1";
    else if (override === "IsClickCard") modifiedFields.IsClickCard = "1";
    else if (override === "IsSentenceCard") modifiedFields.IsSentenceCard = "1";
    else if (override === "IsAudioCard") modifiedFields.IsAudioCard = "1";
  }

  const [$ankiFields, $setAnkiFields] = createStore<AnkiFields>({
    ...modifiedFields,
    __IS_ROOT__: props.isRoot ?? false,
  });

  const $isRootAnkiFields = createMemo(() => Boolean($ankiFields.__IS_ROOT__));
  const $isInitialAnkiFields = createMemo(
    () => $ankiFields.CardID === props.initialAnkiFields.CardID,
  );
  const $isRootInitialAnkiFields = createMemo(() => Boolean(props.initialAnkiFields.__IS_ROOT__));

  const resetAnkiFields = () => {
    $setAnkiFields({ ...modifiedFields, __IS_ROOT__: props.isRoot });
  };

  return (
    <AnkiFieldsContext.Provider
      value={{
        noteId: props.noteId,
        $ankiFields,
        $setAnkiFields,
        $isRootAnkiFields,
        $isInitialAnkiFields,
        initialAnkiFields: props.initialAnkiFields,
        $isRootInitialAnkiFields,
        resetAnkiFields,
      }}
    >
      {props.children}
    </AnkiFieldsContext.Provider>
  );
}

export function useAnkiFieldContext() {
  const ankiField = useContext(AnkiFieldsContext);
  if (!ankiField) throw new Error("Missing AnkiFieldContext");
  return ankiField;
}

export type UseAnkiFieldContext = typeof useAnkiFieldContext;

const RootAnkiFieldsContext = createContext<{
  $ankiFields: Store<AnkiFields>;
  $setAnkiFields: SetStoreFunction<AnkiFields>;
  $isRootAnkiFields: Accessor<boolean>;
  $isInitialAnkiFields: Accessor<boolean>;
  noteId?: number;
  initialAnkiFields: AnkiFields;
  resetAnkiFields: () => void;
}>();

export function RootAnkiFieldsContextProvider(props: { children: JSX.Element }) {
  const value = useAnkiFieldContext();

  return (
    <RootAnkiFieldsContext.Provider value={value}>{props.children}</RootAnkiFieldsContext.Provider>
  );
}

export function useRootAnkiFieldsContext() {
  const value = useContext(RootAnkiFieldsContext);
  if (!value) throw new Error("Missing RootAnkiFieldsContext");
  return value;
}
