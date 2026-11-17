import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type { Navigation } from "../../features/navigation/controller";
import { useIdentityNames } from "../../features/identity-names/react";
import { formatPublicKey } from "../../shared/identity/public-key";
import { avatarMedia } from "../../shared/avatar-source";
import { buzzLinkTarget } from "../../features/navigation/buzz-links";
import { targetKey } from "../../features/navigation/targets";
import {
  noteKey,
  noteAddress,
  noteUrl,
  parseNoteUrl,
  type Note,
  type NoteAddress,
} from "./model";
import type { NotesWorkspace } from "./workspace";
import { useNotesCollection } from "./collection";
import type { PageProps } from "../../features/pages/service";
import { usePagesUi } from "./ui";
import type { PanelProps } from "../../features/panels/service";
import {
  useRelayConnection,
  useProfileGeneration,
} from "../../features/relay/react";
import type { RelayData } from "../../features/relay/service";
import type { RelaySession } from "../../features/relay/session";
import { NoteIcon } from "../../shared/design-system/icons";
import { Button } from "../../shared/design-system/ui/Button";
import { Panel } from "../../shared/design-system/ui/Panel";
import {
  PanelHeader,
  PanelHeaderLabel,
} from "../../shared/design-system/ui/PanelHeader";
import { NoteDocument, type NoteFocus } from "./NoteDocument";
import { NewNoteDocument, type NewDraft } from "./NewNoteDocument";
import { NotesPage } from "./NotesPage";
import styles from "./WorkingNotes.module.css";
import {
  workingRoute,
  workingTarget,
  type WorkingRoute,
  type DocumentView,
} from "./working-route";

export type NotesOwner = (session: RelaySession) => NotesWorkspace;

function openBuzzLink(
  navigator: Navigation | undefined,
  session: RelaySession,
  url: string,
) {
  const target = buzzLinkTarget(url, {
    viewer: session.viewer ?? "",
    communityOrigin: session.scope.replace(/:[0-9a-f]{64}$/, ""),
  });
  if (!navigator || !target) return false;
  void navigator.open(target);
  return true;
}
export function WorkingNotesPage({
  relay,
  getWorkspace,
  navigator,
  navigation,
  ...props
}: PageProps & {
  relay: RelayData;
  getWorkspace: NotesOwner;
  navigator: Navigation;
}) {
  const connection = useRelayConnection(relay);
  const request = useMemo(
    () => navigation?.forSession(relay, connection),
    [navigation, relay, connection],
  );
  useEffect(() => {
    if (
      request?.target.kind !== "page" ||
      request.target.scope ||
      connection.status !== "ready" ||
      !connection.viewer ||
      !connection.scope
    )
      return;
    request.resolve({
      ...request.target,
      scope: {
        viewer: connection.viewer,
        communityOrigin: connection.scope.slice(
          0,
          -(connection.viewer.length + 1),
        ),
      },
    });
  }, [request, connection]);
  if (connection.status !== "ready")
    return (
      <Panel>
        <PanelHeader
          title={
            <PanelHeaderLabel title="Docs" icon={<NoteIcon size={16} />} />
          }
        />
        <div className={styles.browser}>
          <p role="status">
            {connection.status === "connecting"
              ? "Connecting to working docs…"
              : "Connect to your community to open docs."}
          </p>
          {connection.status === "error" && (
            <>
              <p role="alert">{connection.error}</p>
              <Button onClick={() => relay.retry()}>Retry connection</Button>
            </>
          )}
        </div>
      </Panel>
    );
  const route =
    request?.target.kind === "page"
      ? workingRoute(request.target.route?.params)
      : undefined;
  if (route?.community && route.community !== connection.origin)
    return <p role="status">Connect to this doc’s community to open it.</p>;
  return (
    <WorkingNotesCommunity
      key={`${connection.scope}:${connection.generation}`}
      workspace={getWorkspace(connection.session)}
      relay={relay}
      navigator={navigator}
      navigation={navigation}
      {...props}
    />
  );
}

export function WorkingNotesCommunity({
  workspace,
  relay,
  navigator,
  navigation,
}: PageProps & {
  workspace: NotesWorkspace;
  relay?: RelayData;
  navigator?: Navigation;
}) {
  const request = relay
    ? navigation?.forSession(relay, relay.snapshot())
    : undefined;
  const route =
    request?.target.kind === "page" ? request.target.route?.params : undefined;
  const destination = useMemo(() => workingRoute(route), [route]);
  const initial = useMemo(
    () => (destination?.view === "page" ? noteAddress(destination) : undefined),
    [destination],
  );
  const searchRef = useRef<HTMLElement>(null);
  const { collection, setCollection, loading, error, load, changed, remove } =
    useNotesCollection(workspace);
  const [query, setQuery] = useState(destination?.query ?? "");
  const [trash, setTrash] = useState(destination?.trash ?? false);
  const [folder, setFolder] = useState(destination?.folder);
  const { profiles, viewer } = workspace.session;
  const creators = useMemo(
    () =>
      [...new Set(Object.values(collection.creators))]
        .filter((creator) => creator !== viewer)
        .sort(),
    [collection.creators, viewer],
  );
  const identities = useMemo(
    () => [
      ...new Set([
        ...creators,
        ...collection.notes.map((note) => note.event.pubkey).sort(),
      ]),
    ],
    [creators, collection.notes],
  );
  const profileMap = useSyncExternalStore(
    profiles.subscribe,
    profiles.snapshot,
  );
  const resolveName = useIdentityNames(workspace.session.names);
  const generation = useProfileGeneration(profiles);
  useEffect(() => {
    void generation;
    const release = profiles.reserve?.(identities.length);
    // Use the shared directory's budget and de-duplicated background reads.
    // Missing ownership evidence leaves a document in Shared with me;
    // missing editor profiles use public-key labels.
    void profiles
      .ensure(identities.slice(0, profiles.limit?.()), "background")
      .catch(() => {});
    return release;
  }, [profiles, identities, generation]);
  const readOwned = () =>
    creators
      .filter((creator) => viewer && profiles.owner?.(creator) === viewer)
      .join(":");
  const owned = useSyncExternalStore(profiles.subscribe, readOwned, readOwned);
  const mainCreators = new Set([viewer, ...owned.split(":").filter(Boolean)]);
  const drafts = useRef(new Map<string, NewDraft>());
  const createdDrafts = useRef(new Map<string, NoteAddress>());
  const createdFocus = useRef(new Map<string, NoteFocus>());
  const createdAutoSave = useRef(new Map<string, boolean>());
  const [opened, setOpened] = useState<NoteAddress[]>(() =>
    initial ? [initial] : [],
  );
  const [selected, setSelected] = useState(
    initial ? noteKey(initial) : "browse",
  );
  const selectedRef = useRef(selected);
  selectedRef.current = selected;
  const reveal = useCallback((address: NoteAddress) => {
    setOpened((old) =>
      old.some((item) => noteKey(item) === noteKey(address))
        ? old
        : [...old, { id: address.id, channel: address.channel }],
    );
    setSelected(noteKey(address));
  }, []);
  const visit = useCallback(
    (next: WorkingRoute, replace = false) => {
      if (
        !navigator ||
        !request ||
        request.signal.aborted ||
        request.target.kind !== "page" ||
        navigator.snapshot().entry.id !== request.entryId
      )
        return;
      const target = workingTarget(request.target, next);
      if (targetKey(target) === targetKey(navigator.snapshot().entry.target))
        return;
      void navigator.open(target, {
        focus: "preserve",
        replace,
      });
    },
    [navigator, request],
  );
  const open = (
    address: NoteAddress,
    replace = false,
    dialog?: DocumentView["dialog"],
  ) => {
    reveal(address);
    visit(
      {
        view: "page",
        ...noteAddress(address),
        ...(dialog ? { dialog } : {}),
        query,
        trash,
        ...(folder ? { folder } : {}),
      },
      replace,
    );
  };
  const browse = () => {
    setSelected("browse");
    visit({ view: "browse", query, trash, ...(folder ? { folder } : {}) });
    requestAnimationFrame(() => searchRef.current?.focus());
  };
  const newNote = (draft: Omit<NewDraft, "id">) => {
    const next = { ...draft, id: crypto.randomUUID() };
    drafts.current.set(next.id, next);
    setSelected(`new:${next.id}`);
    visit({
      view: "new",
      draft: next.id,
      query,
      trash,
      ...(folder ? { folder } : {}),
    });
  };
  useEffect(() => {
    if (initial) reveal(initial);
    else if (destination) setSelected("browse");
    if (destination) {
      setQuery(destination.query ?? "");
      setTrash(destination.trash ?? false);
      setFolder(destination.folder);
      if (destination.view === "new" && destination.draft) {
        const created = createdDrafts.current.get(destination.draft);
        if (created) {
          reveal(created);
          const { draft: _draft, ...rest } = destination;
          visit({ ...rest, view: "page", ...created }, true);
        } else {
          if (!drafts.current.has(destination.draft))
            drafts.current.set(destination.draft, {
              id: destination.draft,
              title: "",
              markdown: "",
            });
          setSelected(`new:${destination.draft}`);
        }
      }
    }
  }, [initial, destination, reveal, visit]);
  const visible = collection.notes.filter((note) => trash || !note.deleted);
  const isMain = (note: Note) =>
    mainCreators.has(collection.creators[note.channel] ?? "");
  return (
    <NotesPage
      community={workspace.session.scope.replace(/:[0-9a-f]{64}$/, "")}
      author={(note) => {
        const key = note.event.pubkey;
        const profile = profileMap.get(key);
        return {
          name:
            key === viewer
              ? "You"
              : resolveName(key, profile?.name ?? formatPublicKey(key) ?? key),
          picture: avatarMedia(profile?.picture, workspace.session.media),
          isAgent: !!profile?.isAgent,
        };
      }}
      {...{
        selected,
        query,
        trash,
        folder,
        searchRef,
        loading,
        more: collection.more,
        error,
        search: (value, commit) => {
          setQuery(value);
          if (commit)
            visit({
              ...(destination ?? { view: "browse" }),
              query: value,
              trash,
            });
        },
        showDeleted: (value) => {
          setTrash(value);
          visit({
            ...(destination ?? { view: "browse" }),
            query,
            trash: value,
          });
        },
        showShared: (shared) => {
          const next = shared ? "shared" : undefined;
          setFolder(next);
          setQuery("");
          visit({ view: "browse", trash, ...(next ? { folder: next } : {}) });
        },
        create: () => newNote({ title: "", markdown: "" }),
        refresh: () => {
          void load();
        },
        loadMore: () => {
          void load(true);
        },
        browse,
        entries: visible.filter((note) =>
          folder ? !isMain(note) : isMain(note),
        ),
        sharedCount: visible.filter((note) => !isMain(note)).length,
        canFilter: !!collection.notes.length || trash,
        open,
        items: [
          ...opened.map((address) => {
            const key = noteKey(address);
            return {
              id: key,
              label:
                collection.notes.find((note) => noteKey(note) === key)?.title ??
                "Doc",
              content: (
                <NoteDocument
                  address={address}
                  initialFocus={createdFocus.current.get(key)}
                  initialAutoSave={createdAutoSave.current.get(key)}
                  workspace={workspace}
                  catalogue={collection.notes}
                  partial={collection.more}
                  active={selected === key}
                  view={
                    selected === key && destination?.view === "page"
                      ? destination
                      : undefined
                  }
                  onViewChange={
                    selected === key
                      ? (view) =>
                          visit({
                            view: "page",
                            ...noteAddress(address),
                            query,
                            trash,
                            ...(folder ? { folder } : {}),
                            ...view,
                          })
                      : undefined
                  }
                  onOpen={open}
                  onOpenLink={(url) =>
                    openBuzzLink(navigator, workspace.session, url)
                  }
                  onUnavailable={(missing) => remove([missing.channel])}
                  onChange={changed}
                />
              ),
            };
          }),
          ...[...drafts.current.values()].map((draft) => ({
            id: `new:${draft.id}`,
            label: "New doc",
            content: (
              <NewNoteDocument
                workspace={workspace}
                initial={draft}
                catalogue={collection.notes}
                active={selected === `new:${draft.id}`}
                onDraftChange={(next) => drafts.current.set(next.id, next)}
                onCreated={(note, { autoSave, focus, share }) => {
                  if (focus) createdFocus.current.set(noteKey(note), focus);
                  createdAutoSave.current.set(noteKey(note), autoSave);
                  createdDrafts.current.set(draft.id, noteAddress(note));
                  drafts.current.delete(draft.id);
                  setCollection((old) => ({
                    ...old,
                    creators: {
                      ...old.creators,
                      [note.channel]: workspace.session.viewer ?? "",
                    },
                  }));
                  changed(note);
                  if (selectedRef.current === `new:${draft.id}`)
                    open(note, true, share ? "share" : undefined);
                }}
              />
            ),
          })),
        ],
      }}
    />
  );
}

/** The channel owns this tab; linked views retain drafts while moving back. */
export function WorkingNotePanel({
  target,
  relay,
  getWorkspace,
  navigator,
  context,
}: PanelProps & {
  relay: RelayData;
  getWorkspace: NotesOwner;
  navigator: Navigation;
}) {
  const connection = useRelayConnection(relay);
  const initial = useMemo(() => parseNoteUrl(target), [target]);
  if (
    !initial ||
    connection.status !== "ready" ||
    initial.community !== connection.origin
  )
    return (
      <div className={styles.browser}>
        <p role="status">Connect to this doc’s community to open it.</p>
      </div>
    );
  return (
    <NotePanelContents
      key={`${connection.scope}:${connection.generation}`}
      initial={initial}
      workspace={getWorkspace(connection.session)}
      navigator={navigator}
      context={context}
    />
  );
}

function NotePanelContents({
  initial,
  workspace,
  navigator,
  context,
}: {
  initial: NoteAddress;
  workspace: NotesWorkspace;
  navigator: Navigation;
  context: PanelProps["context"];
}) {
  const {
    collection: catalogue,
    error,
    changed,
    remove,
  } = useNotesCollection(workspace);
  const title =
    catalogue.notes.find((note) => noteKey(note) === noteKey(initial))?.title ??
    "Doc";
  const communityOrigin = workspace.session.scope.replace(/:[0-9a-f]{64}$/, "");
  const viewer = workspace.session.viewer ?? "";
  const openInDocs = useCallback(
    (address: NoteAddress) => {
      void navigator.open({
        version: 1,
        kind: "page",
        pluginId: "com.squareup.pages",
        pageId: "pages",
        scope: { viewer, communityOrigin },
        route: {
          version: 1,
          params: { view: "page", ...noteAddress(address) },
        },
      });
    },
    [navigator, viewer, communityOrigin],
  );
  const showInDocs = useCallback(
    () => openInDocs(initial),
    [openInDocs, initial],
  );
  const tabActions = useMemo(
    () => [{ label: "Open in Docs", run: showInDocs }],
    [showInDocs],
  );
  usePagesUi().panels.useTabTitle?.(title, undefined, tabActions);
  const open = (address: NoteAddress) => {
    if (!context?.open(noteUrl(address, communityOrigin))) openInDocs(address);
  };
  return (
    <div className={styles.page}>
      {error && (
        <p role="status" className="text-caption text-subtle">
          Related docs could not be loaded. {error}
        </p>
      )}
      {[initial].map((address) => (
        <div className={styles.page} key={noteKey(address)}>
          <NoteDocument
            address={address}
            workspace={workspace}
            catalogue={catalogue.notes}
            partial={catalogue.more}
            onChange={changed}
            onUnavailable={(missing) => remove([missing.channel])}
            onOpen={open}
            onOpenInDocs={showInDocs}
            onOpenLink={(url) =>
              openBuzzLink(navigator, workspace.session, url)
            }
          />
        </div>
      ))}
    </div>
  );
}
